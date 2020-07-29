# midi2mqtt

This will be a general purpose MIDI to MQTT gateway/translator.

Right now it's more like a MIDI to OSC gateway used to control my [Behringer X32 RACK](https://www.behringer.com/product.html?modelCode=P0AWN) mixer and.. Spotify via dbus.

# Things to node

The nodejs OSC library used has had to be hacked to allow messages coming on topic that does not start with a slash character. Yup, Behringer did this to you.

