const util       = require('util');
const InputEvent = require('./');
const Keyboard   = require('./keyboard');

const EV_TOUCH_ABS = {
    ABS_X: 0,
    ABS_Y: 1,
    ABS_MT_SLOT: 47,
    ABS_MT_TOUCH_MAJOR: 48,
    ABS_MT_TOUCH_MINOR: 49,
    ABS_MT_ORIENTATION: 52,
    ABS_MT_POSITION_X: 53,
    ABS_MT_POSITION_Y: 54,
    ABS_MT_TRACKING_ID: 57,
    ABS_MT_TOOL_X: 60,
    ABS_MT_TOOL_Y: 61
};

const EV_TOUCH_KEY = {
    BTN_TOUCH: 330
};

const EV_TOUCH_TYPE = {
    EV_KEY: 1,
    EV_ABS: 3
};

let slots={};

function TouchScreen(device) {
    var self = this;
    Keyboard.apply(this, arguments);
    this.on('data', function(ev, data){
        if(ev.type == InputEvent.EVENT_TYPES.EV_ABS){
            switch(ev.code) {
                //case EV_TOUCH_ABS.ABS_X:
                //case EV_TOUCH_ABS.ABS_Y:
                case EV_TOUCH_ABS.ABS_MT_POSITION_X:
                case EV_TOUCH_ABS.ABS_MT_POSITION_Y:
                this.emit('move', ev);
            };
        }
    });
};

util.inherits(TouchScreen, Keyboard);

module.exports = TouchScreen;

