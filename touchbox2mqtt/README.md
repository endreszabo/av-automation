# touchbox2mqtt

tl;dr: a nodejs script to send different rectangle shaped area touch events to an MQTT broker

# Details

## Prerequisites

You'll need a touchscreen monitor to use this module.

Use evtest(1) to find out the maximum values of `ABS_MT_POSITION_X` and `ABS_MT_POSITION_Y` constants for your touchscreens. I've got two different make touchscreens and these values differ. Place their values in the script constants:

```javascript
const max_x = 16384;
const max_y = 9600;
```

Construct the box mappings JavaScript object. It takes a key for a representative name of the box and a 4 element list with "starting X position, starting Y postition, ending X position, ending Y position" boundary values respectively. See example for the BMD Atem Mini Pro multiviewer mini-screens:

```javascript
const ATEMMiniProBoxes = {
    'preview': [max_x/4*0, max_y/4*0, max_x/4*2, max_y/4*2],
    'program': [max_x/4*2, max_y/4*0, max_x/4*4, max_y/4*2],
	...
```

## How it works

- It opens the touchscreen devinput device of your touchscreen.
- It processes motion (dragging) and general touch (keypress-like) event from the devinput layer.
- It then checks if these given X/Y coordinates are in the area of any of the predefined touch areas/squares (internally called as *boxes*)
- It will process the touch events to convert the touch to any click-like gestures if possible (dragging, doubleclicking, long tapping, etc)
- Finally it will send out the results of the above to the MQTT broker topics.

## Supported events

These events are all artificial. The script only gets touch (as key down and up events) and dragging (as you move your finger on the surface while touching) events that it converts to better known mouse-like events. These are the following:

- tap: this is a simple click like event. Your finger touches a box and upon release, a `tap` event will be emitted for the corresponding box.
- doubletap: if tapped twice in a row in `doubleTapTimeout` milliseconds using the above gesture a `doubletap` event will also be emitted. By design it won't suppress emitting a second `tap` event for the second touch. Double clicking works on multiple boxes at the same time.
- longtap: pressing and not releasing a box in `longTapTimeout` milliseconds of time will emit a `longtap` event for the box. It's pretty much like how we right-clicked back in the PDA era. By design it won't suppress a `tap` event upon releasing.
- dragged\_to: this is emitted when a touch event happening (key down event) in a box finishes (key release event) in another box, having your finger moved between them. Value of this event is the name of the new box your finger has been dragged into. This will suppress the `tap` event.
- touched: this is the most simple event, it is simply emitted when a touch event happened to a box. And that's all.
- left: this event is emitted during dragging when finger exits the box.
- reentered: this event is emitted during dragging when finger reenters the original box. Obviously this will not get emitted if touch finishes in another box.

## Things to note

Not a bug of this script but one of the input-event lib I'm using: it can't open the device exclusively as of now. I implemented the grabbing ioctl support but the lib opens the device twice (once for motion and once for keypress events) and this leads to EBUSY errors on the second ioctl round. Until this gets fixed you might want to disable the xinput devices of the touchscreen driver of Xorg to stop interfering with Xorg and its applications by issuing:

```sh
xinput disable pointer:'ILITEK ILITEK-TP Mouse'
xinput disable pointer:'ILITEK ILITEK-TP'
```

To access devinput devices the running user might wants to be a member of the `input` Linux group so it can access raw devinput /dev nodes.
