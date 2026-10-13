#!/bin/bash
# montaz.sh KADR.png LEKTOR.mp3 NAPISY.ass WYJ.mp4  — wersja bez lip-sync: powolny zoom + napisy + plansze
set -e
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")
T=$(python3 -c "print(round($D+2.9,2))")
N=$(python3 -c "print(int($T*30))")
ffmpeg -v error -y -loop 1 -framerate 30 -i "$1" -i "$2" -filter_complex \
 "[0:v]scale=2160:3840,zoompan=z='1+0.06*on/$N':x='iw/2-(iw/zoom/2)':y='ih*0.42-(ih/zoom*0.42)':d=$N:s=1080x1920:fps=30,ass=$3,fade=t=out:st=$(python3 -c "print($T-0.4)"):d=0.4[v];[1:a]apad,atrim=0:$T,afade=t=out:st=$(python3 -c "print($T-0.5)"):d=0.5[a]" \
 -map "[v]" -map "[a]" -t $T -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$4"
