const atemAddress = '44.128.4.58';
const baseAddr = '/mqtt2atem/'+atemAddress+'/';

const { Atem } = require('atem-connection')
const myAtem = new Atem({ externalLog: console.log })
myAtem.connect(atemAddress);

const EventEmitter = require('events');
class AtemEventsEmitter extends EventEmitter {}
const AtemEvent = new AtemEventsEmitter();

// Set up MQTT
const MqttTopic = require('mqtt-wildcard-emitter');
MqttTopic.connect('mqtt://44.128.7.255');
//for traversing objects like paths (that has been given by ATEM state listener)
//
const objectPath = require("object-path");

//global variable for reference if the multiview display is show or not
var multiViewVisible = false;

inputByIdMappings = {}
inputByLongNameMappings = {}
macroByIdMappings = {}
macroByNameMappings = {}

const DefaultEventHandler = function(key, value) {
    if (key.substr(0,7) === 'inputs.') {
        inputByIdMappings[value['inputId']] = value;
        inputByLongNameMappings[value['longName']] = value;
    } else if (key.substr(0,22) === 'macro.macroProperties.') {
        if (value['isUsed']) {
            macroByIdMappings[value['macroIndex']] = value;
            macroByNameMappings[value['name']] = value;
            MqttTopic.mqttclient.publish(baseAddr+'macro/'+String(value['macroIndex'])+'/name', value['name']);
        }
    } else
      console.log('changed:', key, value);
}

myAtem.on('stateChanged', function(err, key) {
  //prevent event polluting with unsubscribed events
  if (key in AtemEvent._events)
    AtemEvent.emit(key, key, objectPath.get(myAtem.state, key));
  else
    DefaultEventHandler(key, objectPath.get(myAtem.state, key));
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


//commands accepted from MQTT
MqttTopic.on(baseAddr+'set/upstream_keyer_onair', function(topic, value) {
    myAtem.setUpstreamKeyerOnAir(value=='1')
});
MqttTopic.on(baseAddr+'set/program_input_by_longname', function(topic, value) {
    myAtem.changeProgramInput(inputByLongNameMappings[value]['inputId']);
});
MqttTopic.on(baseAddr+'set/preview_input_by_longname', function(topic, value) {
    myAtem.changePreviewInput(inputByLongNameMappings[value]['inputId']);
});
MqttTopic.on(baseAddr+'macro/run_by_name', function(topic, value) {
    myAtem.macroRun(macroByNameMappings[value]['macroIndex']);
});

//events sent to MQTT
AtemEvent.on('video.auxilliaries.0', function(path, val) {
    //store this in the global variable
    multiViewVisible = val == 9001;
    MqttTopic.mqttclient.publish(baseAddr+'multiview_visible', multiViewVisible && '1' || '0');
    MqttTopic.mqttclient.publish(baseAddr+path.replace(/\./g,'/'), JSON.stringify(val));
    MqttTopic.mqttclient.publish(baseAddr+'aux_out',String(val));
});

AtemEvent.on('video.ME.0.programInput', function(path, val) {
    MqttTopic.mqttclient.publish(baseAddr+path.replace(/\./g,'/'), JSON.stringify(val));
    MqttTopic.mqttclient.publish(baseAddr+'program', JSON.stringify(val));
    MqttTopic.mqttclient.publish(baseAddr+'program_with_longname', inputByIdMappings[val]['longName']);
    MqttTopic.mqttclient.publish(baseAddr+'program_with_shortname', inputByIdMappings[val]['shortName']);
});

AtemEvent.on('video.ME.0.previewInput', function(path, val) {
    MqttTopic.mqttclient.publish(baseAddr+path.replace(/\./g,'/'), JSON.stringify(val));
    MqttTopic.mqttclient.publish(baseAddr+'preview', JSON.stringify(val));
    MqttTopic.mqttclient.publish(baseAddr+'preview_with_longname', inputByIdMappings[val]['longName']);
    MqttTopic.mqttclient.publish(baseAddr+'preview_with_shortname', inputByIdMappings[val]['shortName']);
});

AtemEvent.on('video.ME.0.upstreamKeyers.0.onAir', function(path, val) {
    MqttTopic.mqttclient.publish(baseAddr+path.replace(/\./g,'/'), val && '1' || '0');
    MqttTopic.mqttclient.publish(baseAddr+'pip', val && '1' || '0');
});


console.log(Object.keys(AtemEvent._events));
