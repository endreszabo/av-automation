const controllerName = 'nanoKONTROL2:nanoKONTROL2 MIDI 1 20:0';
const baseAddr = '/midi2mqtt/'+controllerName+'/';
const channel = 4; //the channel on this microcontroller send its events

// Set up MQTT
const MqttTopic = require('mqtt-wildcard-emitter');
MqttTopic.connect('mqtt://44.128.7.255');

// Set up MIDI
var midi = require('midi');
var midiIn = new midi.input();
var midiOut = new midi.output();


var portInToUse=null;
var portOutToUse=null;

for (port=0; port<midiIn.getPortCount(); port++) {
    if (midiIn.getPortName(port) === controllerName) {
        portInToUse=port; break;
    }
}


for (port=0; port<midiOut.getPortCount(); port++) {
    if (midiOut.getPortName(port) === controllerName) {
        portOutToUse=port; break;
    }
}

MqttTopic.on(baseAddr+'out/#', function(mask, addr, message) {
    console.log(mask, addr, message);
    //midiOut.sendMessage(messages[1]);
});

midiIn.on('message', function(deltaTime, m) {
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  if (m[0]>=0xb0 && m[0]<0xc0) { //Control Change event
      const chan = m[0]%16+1;
      const control = m[1];
      if (control>=16 && control<16+8) { // Knobs
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/knob/'+String(control%16), String(m[2]));
      } else if (control>=0 && control<8) { // Faders
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/fader/'+String(control%16), String(m[2]));
      } else if (control>=32 && control<40) { // Solo buttons
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/solo_button/'+String(control%16), String(m[2]));
      } else if (control>=48 && control<56) { // Mute buttons
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/mute_button/'+String(control%16), String(m[2]));
      } else if (control>=64 && control<72) { // Record buttons
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/record_button/'+String(control%16), String(m[2]));
      } else
          MqttTopic.mqttclient.publish(baseAddr+'in/'+chan.toString()+'/'+control.toString(), String(m[2]));
  }
});

midiIn.openPort(portInToUse);
midiOut.openPort(portOutToUse);

