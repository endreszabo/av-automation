# mqtt2ffmpeg-rtmp-ingest

tl;dr: a bash wrapper to remote control `ffmpeg` RTMP ingest server 

# Description

I use the streaming feature of the [https://www.blackmagicdesign.com/products/atemmini](BMD Atem Mini Pro) to make local. I do this because I find the record-to-disk via USB inconvenient as I use the switcher as a webcam day-to-day. That would involve a lot of replugging of the USB devices as switcher would have to change USB roles between USB host (for disks) and USB device (to act as a webcam).

## Invocation

This is a simple script to be launched via a user level systemd service. Of course it can be started by hand, but it will not fork or release the terminal whatsoever.

## How it works

It starts `ffmpeg` and wait for commands via its MQTT topic `/mqtt2ffmpeg-rtmp-ingest/command`.

It accepts two commands:
- `commit`: save the current video (rename it to `$TIMESTAMP_committed.mp4`),
- `failed`: ditch it (rename to resemble that it is a garbage, namely `$TIMESTAMP_failed.mp4`).

If the switcher stops sending the video (by pressing the stream OFF button on its surface for example) the script will rename the temporary video to `$TIMESTAMP_manual.mp4`.

Later on I can collect/concatenate the committed videos for further editing.
