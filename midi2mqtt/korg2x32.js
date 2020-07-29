var midi = require('midi');
var osc = require('osc');
var dbus = require('dbus-native');

// DBus stuff
var sessionBus = dbus.sessionBus();

// Create an osc.js UDP Port listening on port 57121.
var oscSocket = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121,
    metadata: true
});

Number.prototype.pad = function(size) {
  var s = String(this);
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}

let matchMidi = {};
let matchOsc = {};

let matchNode = {};

let initMessages = [];
let muteStatuses = {};
let soloStatuses = {};
let spotifyMethod = '';

let mapMidiCCToFader = function(midiCc, channel, max) {
    if(typeof max === 'undefined') {
        max = 0.75;
    }
    matchMidi[midiCc] = function(message) {
        return [
            {
                address: '/ch/'+(channel).pad(2)+'/mix/fader',
                args: [
                    { type: "f", value: message[2]/(127/max) }
                ]
            },
            null
        ];
    }
    // no match on OSC as midi controller has no motoric faders
}

let mapMidiCCToFloat = function(midiCc, address, max) {
    if(typeof max === 'undefined') {
        max = 0.75;
    }
    matchMidi[midiCc] = function(message) {
        if(message[1] === 2) {
            if (message[2]===0) {
                if (spotifyMethod !== 'Pause') {
                    spotifyMethod = 'Pause';
                    controlSpotify(spotifyMethod);
                }
            } else {
                if (spotifyMethod !== 'Play') {
                    spotifyMethod = 'Play';
                    controlSpotify(spotifyMethod);
                }
            }
        };

        return [
            {
                address: address,
                args: [
                    { type: "f", value: message[2]/(127/max) }
                ]
            },
            null
        ];
    }
    // no match on OSC as midi controller has no motoric faders
}
let controlSpotify = function(method) {
    sessionBus.invoke({
        path:'/org/mpris/MediaPlayer2',
        destination: 'org.mpris.MediaPlayer2.spotify',
        'interface': 'org.mpris.MediaPlayer2.Player',
        member: method,
        type: dbus.messageType.methodCall
    }, function(err, res) {
        console.log('dbus response', res);
    });
}

let mapMidiCCToMonitor = function(midiCc, channel, max) {
    if(typeof max === 'undefined') {
        max = 0.75;
    }
    matchMidi[midiCc] = function(message) {
        return [[
            {
                address: '/config/solo/level',
                args: [
                    { type: "f", value: message[2]/(127/max) }
                
            ]
            }],
            null
        ];
    }
    // no match on OSC as midi controller has no motoric faders
}

let mapMidiCCToMute = function(midiCc, channel) {
    matchMidi[midiCc] = function(message) {
        if(message[2]==127) { // button pressed
            muteStatuses[channel]=!muteStatuses[channel];
            return [
                {
                    address: '/ch/'+(channel).pad(2)+'/mix/on',
                    args: [
                        { type: "i", value: muteStatuses[channel] ? 0 : 1 }
                    ]
                },
                [179, midiCc, muteStatuses[channel] ? 127 : 0]
            ];
        }
        return [null, null];
    }
    matchOsc['/ch/'+(channel).pad(2)+'/mix/on'] = function(oscMessage) {
        muteStatuses[channel]=oscMessage['args'][0]['value'] == 0 ? true : false;
        return [null, [179, midiCc, muteStatuses[channel] ? 127 : 0]];
    };
    matchNode['ch/'+(channel).pad(2)+'/mix/on'] = function(value, oscMessage) {
        if (value === 'OFF') {
            muteStatuses[channel]=true;
        } else if (value === 'ON') {
            muteStatuses[channel]=false;
        }
        return [null, [179, midiCc, muteStatuses[channel] ? 127 : 0]];
    }
    // no match on OSC as midi controller has no motoric faders
}

let mapMidiCCToSolo = function(midiCc, channel) {
    matchMidi[midiCc] = function(message) {
        if(message[2]==127) { // button pressed
            soloStatuses[channel]=!soloStatuses[channel];
            return [
                {
                    address: '/-stat/solosw/'+(channel).pad(2),
                    args: [
                        { type: "i", value: soloStatuses[channel] ? 1 : 0 }
                    ]
                },
                [179, midiCc, soloStatuses[channel] ? 127 : 0]
            ];
        }
        return [null, null];
    }
    matchOsc['/-stat/solosw/'+(channel).pad(2)] = function(oscMessage) {
        soloStatuses[channel]=oscMessage['args'][0]['value'] == 1 ? true : false;
        return [null, [179, midiCc, soloStatuses[channel] ? 127 : 0]];
    };
    matchNode['-stat/solosw/'+(channel).pad(2)] = function(value, oscMessage) {
        if (value === 'OFF') {
            soloStatuses[channel]=false;
        } else if (value === 'ON') {
            soloStatuses[channel]=true;
        }
        return [null, [179, midiCc, soloStatuses[channel] ? 127 : 0]];
    }
    // no match on OSC as midi controller has no motoric faders
}

let mapMidiCCToIntOscToggle = function(midiCc, address) {
    matchMidi[midiCc] = function(message) {
        if(message[2]==127) { // button pressed
            soloStatuses[address]=!soloStatuses[address];
            return [
                {
                    address: address,
                    args: [
                        { type: "i", value: soloStatuses[address] ? 1 : 0 }
                    ]
                },
                [179, midiCc, soloStatuses[address] ? 127 : 0]
            ];
        }
        return [null, null];
    }
    matchOsc[address] = function(oscMessage) {
        soloStatuses[address]=oscMessage['args'][0]['value'] == 1 ? true : false;
        return [null, [179, midiCc, soloStatuses[address] ? 127 : 0]];
    };
    matchNode[address.substr(1)] = function(value, oscMessage) {
        if (value === 'OFF') {
            soloStatuses[address]=false;
        } else if (value === 'ON') {
            soloStatuses[address]=true;
        }
        return [null, [179, midiCc, soloStatuses[address] ? 127 : 0]];
    }
    // no match on OSC as midi controller has no motoric faders
}

let mapMidiCCToInvertedIntOscToggle = function(midiCc, address) {
    matchMidi[midiCc] = function(message) {
        if(message[2]==127) { // button pressed
            soloStatuses[address]=!soloStatuses[address];
            if(message[1] === 50) { /// ch3 mute button
                console.log('dbus event');
                if (soloStatuses[address]) {
                    if (spotifyMethod !== 'Pause') {
                        spotifyMethod = 'Pause';
                        controlSpotify(spotifyMethod);
                    }
                } else {
                    if (spotifyMethod !== 'Play') {
                        spotifyMethod = 'Play';
                        controlSpotify(spotifyMethod);
                    }
                }
            };
            return [
                {
                    address: address,
                    args: [
                        { type: "i", value: soloStatuses[address] ? 0 : 1 }
                    ]
                },
                [179, midiCc, soloStatuses[address] ? 127 : 0]
            ];
        }
        return [null, null];
    }
    matchOsc[address] = function(oscMessage) {
        soloStatuses[address]=oscMessage['args'][0]['value'] == 0 ? true : false;
        return [null, [179, midiCc, soloStatuses[address] ? 127 : 0]];
    };
    matchNode[address.substr(1)] = function(value, oscMessage) {
        if (value === 'OFF') {
            soloStatuses[address]=true;
        } else if (value === 'ON') {
            soloStatuses[address]=false;
        }
        return [null, [179, midiCc, soloStatuses[address] ? 127 : 0]];
    }
    // no match on OSC as midi controller has no motoric faders
}

//faders
//mapMidiCCToFloat(0, '/bus/07/mix/fader',    0.75);
mapMidiCCToFloat(0,  '/ch/01/mix/fader',    0.75);
mapMidiCCToFloat(1,  '/ch/02/mix/fader',    0.75);
mapMidiCCToFloat(2,  '/ch/15/mix/fader',    0.75);
mapMidiCCToFloat(3,  '/ch/17/mix/fader',    0.75);
mapMidiCCToFloat(4,  '/ch/19/mix/fader',    0.75);
mapMidiCCToFloat(5,  '/ch/21/mix/fader',    0.75);
mapMidiCCToFloat(6,  '/bus/07/mix/fader',   0.75);
mapMidiCCToFloat(7,  '/main/st/mix/fader',  0.75);

// knobs
//mapMidiCCToFloat(16, '/ch/17/mix/10/level',    0.75);
//mapMidiCCToFloat(17, '/ch/19/mix/10/level',    0.75);
mapMidiCCToFloat(18, '/ch/15/mix/10/level',    0.75);
mapMidiCCToFloat(19, '/ch/17/mix/10/level',    0.75);
mapMidiCCToFloat(20, '/ch/19/mix/10/level',    0.75);
//mapMidiCCToFloat(21, '/auxin/05/mix/07/level', 0.75);
//mapMidiCCToFloat(22, '/auxin/07/mix/07/level', 0.75);
mapMidiCCToMonitor(23, '/config/solo/level',     0.75);

//mapMidiCCToFader(0, 1);

// mute buttons
mapMidiCCToInvertedIntOscToggle(48,  '/ch/01/mix/on');
mapMidiCCToInvertedIntOscToggle(49,  '/ch/02/mix/on');
mapMidiCCToInvertedIntOscToggle(50,  '/ch/15/mix/on');
mapMidiCCToInvertedIntOscToggle(51,  '/ch/17/mix/on');
mapMidiCCToInvertedIntOscToggle(52,  '/ch/19/mix/on');
mapMidiCCToInvertedIntOscToggle(53,  '/ch/21/mix/on');
mapMidiCCToInvertedIntOscToggle(54,  '/bus/07/mix/on');
mapMidiCCToInvertedIntOscToggle(55,  '/main/st/mix/on');

// solo buttons
mapMidiCCToIntOscToggle(32,'/-stat/solosw/01');
mapMidiCCToIntOscToggle(33,'/-stat/solosw/02');
mapMidiCCToIntOscToggle(34,'/-stat/solosw/15');
mapMidiCCToIntOscToggle(35,'/-stat/solosw/17');
mapMidiCCToIntOscToggle(36,'/-stat/solosw/19');
mapMidiCCToIntOscToggle(37,'/-stat/solosw/21');
//mapMidiCCToIntOscToggle(38,'/-stat/solosw/37');
//mapMidiCCToIntOscToggle(39,'/-stat/solosw/39');

//record buttons
mapMidiCCToIntOscToggle(64,'/ch/01/mix/03/on');
mapMidiCCToIntOscToggle(65,'/ch/02/mix/03/on');
mapMidiCCToIntOscToggle(66,'/ch/15/mix/03/on');
mapMidiCCToIntOscToggle(67,'/ch/17/mix/03/on');
mapMidiCCToIntOscToggle(68,'/ch/19/mix/03/on');
mapMidiCCToIntOscToggle(69,'/ch/21/mix/03/on');
/*mapMidiCCToMute(48, 1);
mapMidiCCToMute(49, 2);
mapMidiCCToSolo(32, 1);
mapMidiCCToSolo(33, 2);
mapMidiCCToSolo(34, 3);
*/
//mapMidiCCToInvertedIntOscToggle(51,'/ch/04/mix/on');

// Set up a new input.
var midiIn = new midi.input();

// Count the available input ports.
console.log(midiIn.getPortCount());

// Get the name of a specified midiIn port.
console.log(midiIn.getPortName(2));

var midiOut = new midi.output();

// Count the available output ports.
midiOut.getPortCount();

// Get the name of a specified midiOut port.
console.log('will use port: ', midiOut.getPortName(2));

let oscReceivedTransport = function(value) {
    /* Stop Pause Play PauseRecord Record FF REW */
    let mapping = {
        6: 41,
        5: 42,
        0: 43,
        2: 44,
        4: 45
    };
    return Object.keys(mapping).map(function(key){return [179, [mapping[key]], (key==value?1:0)*127 ]});
}
let midiReceivedTransport = function(button) {
    let mapping = {
        41: 6,
        42: 5,
        43: 0,
        44: 2,
        45: 4
    };
    return [
        { 
            address: '/-stat/tape/state',
            args: [
                {type: 'i', value: mapping[button]}
            ]
        },
        Object.keys(mapping).map(function(key){return [179, parseInt(key), (key==button?1:0)*127 ]})
    ];
}

/*let midiMapTransport(rew, ff, stop, play, rec) {
    matchNode['/-stat/tape/stateFF\
};
*/

let sendMessages = function(messages, oscSocket, midiOut) {
    // messages = [osc, midi]
    // OSC part
    if(messages[0]) {
        if(typeof messages[0] === 'function')
            messages[0] = messages[0]();
        if(Array.isArray(messages[0])) {
            messages[0].forEach(function(message) {
                console.log('now sending array member:', message);
                oscSocket.send(message, "44.128.4.9", 10023);
            })
        } else if (typeof messages[0] != 'undefined') {
            console.log('now sending single message:', messages[0]);
            oscSocket.send(messages[0], "44.128.4.9", 10023);
        }
    }
    // MIDI part
    if(messages[1]) {
        console.log("about to send midi data:", messages[1]);
        if(typeof messages[1] === 'function')
            messages[1] = messages[1]();
        if(Array.isArray(messages[1][0])) {
            messages[1].forEach(function(message) {
                console.log(message);
                midiOut.sendMessage(message);
            })
        } else if (typeof messages[1] != 'undefined') {
            console.log(messages[1]);
            midiOut.sendMessage(messages[1]);
        }
    }
};

let renew = function() {
    return [
        { address: "/xremote" },
        { address: "/renew" }
    ];
};

let subscribe = function() {
    return [
        { address: "/info" },
        { address: "/status" },
        { address: "/xremote", },
    //    { address: "/node", args: [ { type:"s", value:"-stat/tape/state" } ] }
    ];
};

// Configure a callback.
midiIn.on('message', function(deltaTime, message) {
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  console.log('m:' + message + ' d:' + deltaTime);
//    message[1]++;
    /*
  Object.keys(mapping).forEach(function(key) {
      if(message[1] === mapping[key]) {
          sendMessages({
              address: key,
              args: [
                  { type: "i", value: message[2]/127 }
              ]
          }, oscSocket);
      }
  });
    if((message[1] >= 0) && (message[1] <=7)) {
        sendMessages({
            address: '/ch/'+(message[1]+1).pad(2)+'/mix/fader',
            args: [
                { type: "f", value: message[2]/169 }
            ]
        }, oscSocket);
    }
    */
    if(typeof matchMidi[message[1]] !== 'undefined') {
        sendMessages(matchMidi[message[1]](message), oscSocket, midiOut);
    }
    if((message[1] >= 41) && (message[1] <46)) {
        if(message[2] == 127) { // button pressed
            let retval=midiReceivedTransport(message[1]);
            console.log('transport sending',retval);
            sendMessages(retval, oscSocket, midiOut);
        }
    }
});

oscSocket.on("message", function (message) {
    console.log("An OSC message just arrived!", message);
    /*if(typeof mapping[message['address']] !== 'undefined') {
        midiOut.sendMessage([179, mapping[message['address']], message['args'][0]['value']*127]);
    }*/
    if(message['address'] === '/-stat/tape/state') {
        sendMessages([null, oscReceivedTransport(message['args'][0]['value'])], oscSocket, midiOut)
    }
    if(message['address'] === 'node') {
        let matches = message['args'][0]['value'].match('(.+) (.+)\n');
        console.log("node matches",matches, matchNode);
        sendMessages(matchNode[matches[1].substr(1)](matches[2], message), oscSocket, midiOut);
    }
    if(typeof matchOsc[message['address']] === 'function') {
        sendMessages(matchOsc[message['address']](message), oscSocket, midiOut);
    }
});

// When the port is read, send an OSC message to, say, SuperCollider
oscSocket.on("ready", function () {
//    oscSocket.send({
//        address: "/xremote",
//    }, "192.168.213.112", 10023);
    //
    Object.keys(matchNode).forEach(function(node) {
        initMessages.push({
            address: "/node", args: [
                {
                    type:"s",
                    value: node
                }
            ]
        });
    });
    sendMessages([subscribe, null], oscSocket, midiOut);
    sendMessages([initMessages, null], oscSocket, midiOut);
    setInterval(sendMessages, 5000, [renew, null], oscSocket, midiOut);
});

midiIn.openPort(1);
midiOut.openPort(1);
oscSocket.open();

