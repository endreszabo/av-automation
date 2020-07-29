const InputEvent = require('input-event');
const mqttlib = require('mqtt')

// for devinput devices access running user might wants to be a member of the `input` Linux group
// yes, these are "temporarly" hardcoded
const input = new InputEvent('/dev/input/by-id/usb-ILITEK_ILITEK-TP_V06.00.00.00-event-if00');
const mqtt = mqttlib.connect('mqtt://44.128.7.255')

// practical constants
const longTapTimeout = 500; //msec
const doubleTapTimeout = 500; //msec

const screen = new InputEvent.TouchScreen(input);

//log all events in case of debug needs
//screen.on('data'  , console.log);

//YMMV: use evtest(1) to find out the maximum values of ABS_MT_POSITION_X and ABS_MT_POSITION_Y for your touchscreens. I've got two different make touchscreens and these values differ.
const max_x = 16384;
const max_y = 9600;

const boxes = {
    // mapping of representative names of multiviewer screen boxes
    // and their corresponding touchscreen points
    'preview': [max_x/4*0, max_y/4*0, max_x/4*2, max_y/4*2],
    'program': [max_x/4*2, max_y/4*0, max_x/4*4, max_y/4*2],

    '1':       [max_x/4*0, max_y/4*2, max_x/4*1, max_y/4*3],
    '2':       [max_x/4*1, max_y/4*2, max_x/4*2, max_y/4*3],
    '3':       [max_x/4*2, max_y/4*2, max_x/4*3, max_y/4*3],
    '4':       [max_x/4*3, max_y/4*2, max_x/4*4, max_y/4*3],

    '3001':    [max_x/4*0, max_y/4*3, max_x/4*1, max_y/4*4],
    'stream':  [max_x/4*1, max_y/4*3, max_x/4*2, max_y/4*4],
    'record':  [max_x/4*2, max_y/4*3, max_x/4*3, max_y/4*4],
    'audio':   [max_x/4*3, max_y/4*3, max_x/4*4, max_y/4*4]
};

//per-box timeout objects for preparing for multitouch support
let boxLongTapTimers={};
let boxDoubleTapTimers={};

const getbox = function(x, y) {
    let rv=null;
    Object.keys(boxes).forEach(function(box) {
        if(x>=boxes[box][0] && y>=boxes[box][1] && x<boxes[box][2] && y<boxes[box][3]) {
            rv=box;
        }
    });
    return rv;
};

let x=0;
let y=0;

let left = false;

screen.on('move', function(ev) {
    if(ev.code==53) {
        x=ev.value;
    }
    if(ev.code==54) {
        y=ev.value;
    }
    current_box=getbox(x,y);
    if(from !== current_box) {
        if(!left) {
            mqtt.publish(`/touchbox2mqtt/${from}/left`);
            left=true;
        }
        if (from in boxLongTapTimers)
            clearTimeout(boxLongTapTimers[from]);
            delete(boxLongTapTimers[from]);
    } else {
        if(left) {
            mqtt.publish(`/touchbox2mqtt/${from}/reentered`);
            left=false;
        }
    }
});

let from=null;
let to=null;

const tapbox = function(box) {
    mqtt.publish(`/touchbox2mqtt/${box}/tap`);
}

const doubleTap = function(box) {
    mqtt.publish(`/touchbox2mqtt/${box}/doubletap`);
}
const dragbox = function(box_from, box_to) {
    mqtt.publish(`/touchbox2mqtt/${box_from}/dragged_to`, box_to);
}
const longTap = function(box) {
    mqtt.publish(`/touchbox2mqtt/${box}/longtap`);
    clearTimeout(boxLongTapTimers[from]);
    delete(boxLongTapTimers[from]);
}
const doubleTapCanceler = function(box) {
    clearTimeout(boxDoubleTapTimers[from]);
    delete(boxDoubleTapTimers[from]);
}

screen.on('keyup' , function(ev) {
    if (from in boxLongTapTimers) {
        clearTimeout(boxLongTapTimers[from]);
        delete(boxLongTapTimers[from]);
    }
    to=getbox(x,y);
    if(from==to) {
        tapbox(to);
    } else {
        dragbox(from, to);
    }
});

//never emitted so far though
screen.on('keydown' , ev => console.log('down', ev));

screen.on('keypress' , function(ev) {
    from=getbox(x,y);
    left = false;
    boxLongTapTimers[from] = setTimeout(longTap, longTapTimeout, from);
    mqtt.publish(`/touchbox2mqtt/${from}/touched`);
    if(from in boxDoubleTapTimers) {
        clearTimeout(boxDoubleTapTimers[from]);
        delete(boxDoubleTapTimers[from]);
        doubleTap(from)
    } else
        boxDoubleTapTimers[from] = setTimeout(doubleTapCanceler, doubleTapTimeout, from);
});

