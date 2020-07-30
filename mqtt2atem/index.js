const { Atem } = require('atem-connection')
const myAtem = new Atem({ externalLog: console.log })
myAtem.connect('44.128.4.69')

const mqttlib = require('mqtt')
const mqtt = mqttlib.connect('mqtt://44.128.7.255')
const mqttWildcard = require('mqtt-wildcard');

const EventEmitter = require('events');
class AtemEventsEmitter extends EventEmitter {}
const AtemEvent = new AtemEventsEmitter();

class MqttTopicEmitter extends EventEmitter {}
const MqttTopic = new MqttTopicEmitter();

//override addListener so we will subscribe to the requested MQTT topic(s) at the same time
MqttTopic.on = (function (original) {
    return function (name, callback) {
        mqtt.subscribe(name);
        console.log('subscribing',name);
        return original(name, callback);
    }
})(MqttTopic.on.bind(MqttTopic));

//for traversing objects like paths (that has been given by ATEM state listener)
const objectPath = require("object-path");

//global variable for reference if the multiview display is show or not
var multiViewVisible = false;

myAtem.on('stateChanged', function(err, key) {
  //prevent event polluting with unsubscribed events
  if (key in AtemEvent._events)
    AtemEvent.emit(key, key, objectPath.get(myAtem.state, key));
});

mqtt.on('message', (topic, message) => {
    MqttTopic.eventNames().forEach(function(topicMask) {
        if (mqttWildcard(topic, topicMask))
            MqttTopic.emit(topicMask, topic, message.toString());
    });
});

MqttTopic.on('/touchbox2mqtt/+/longtap', function(topic, value) {
    console.log('got longtap', value)
});

MqttTopic.on('/touchbox2mqtt/1/tap', function(topic, value) { if (multiViewVisible)  myAtem.changeProgramInput(1) });
MqttTopic.on('/touchbox2mqtt/2/tap', function(topic, value) { if (multiViewVisible)  myAtem.changeProgramInput(2) });
MqttTopic.on('/touchbox2mqtt/3/tap', function(topic, value) { if (multiViewVisible)  myAtem.changeProgramInput(3) });
MqttTopic.on('/touchbox2mqtt/4/tap', function(topic, value) { if (multiViewVisible)  myAtem.changeProgramInput(4) });
MqttTopic.on('/touchbox2mqtt/1/longtap', function(topic, value) { myAtem.setAuxSource(1) });
MqttTopic.on('/touchbox2mqtt/2/longtap', function(topic, value) { myAtem.setAuxSource(2) });
MqttTopic.on('/touchbox2mqtt/3/longtap', function(topic, value) { myAtem.setAuxSource(3) });
MqttTopic.on('/touchbox2mqtt/4/longtap', function(topic, value) { myAtem.setAuxSource(4) });
MqttTopic.on('/touchbox2mqtt/+/touched', function(topic, value) { myAtem.setAuxSource(9001) });

AtemEvent.on('video.auxilliaries.0', function(path, val) {
    //store this in the global variable
    multiViewVisible = val == 9001;
    mqtt.publish('/atem2mqtt/44.128.4.69/'+path.replace(/\./g,'/'), JSON.stringify(val));
    console.log('Multiview visible: ', multiViewVisible);
});

console.log(Object.keys(AtemEvent._events));
