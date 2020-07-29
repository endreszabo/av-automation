#!/bin/bash
set -o nounset
set -o errexit

#target directory for the recordings
export VIDEO_BASEDIR="$HOME/videos/atem_recordings"
export RTMP_DESTINATION='44.128.4.122:1935'

cmd=''

while true; do
	(
	    s_exit=0
		while true; do
			TS="$(date +%s)"
			FN="$VIDEO_BASEDIR/temporary-$TS"
			VERDICT="manual"
			failed_recording() {
				VERDICT="failed"
				kill -INT "$FPID"
				s_exit=1
			}
			commit_recording() {
				VERDICT="committed"
				kill -INT "$FPID"
				s_exit=1
			}
			trap failed_recording SIGUSR1
			trap commit_recording SIGUSR2
			trap "exit 0" SIGINT

			ffmpeg -f flv -listen 1 -i "rtmp://${RTMP_DESTINATION}/live/app" -c copy "$FN.mp4" 2> "$FN.txt" &
			FPID=$!
			wait
			FINAL_TS="$(date +%F_%T)"
			mv -v "$FN.mp4" "$VIDEO_BASEDIR/${FINAL_TS}_$VERDICT.mp4"
			mv -v "$FN.txt" "$VIDEO_BASEDIR/${FINAL_TS}_$VERDICT.txt"
			if [ "$s_exit" == "1" ]; then
				exit 0;
			fi
		done
	) &
	cmd="$(mosquitto_sub -h 44.128.255.255 -t /mqtt2ffmpeg-rtmp-ingest/command -C 1)"
	case "$cmd" in
		failed)
			kill -USR1 %1
			;;
		commit)
			kill -USR2 %1
			;;
	esac
	wait
done

trap "kill -INT %1" SIGINT
trap "kill -INT %1" SIGTERM
