The idea behind this project is to go over all of your SSBM slippi replay files and get the conversions (as defined by slippi-js, basically combos). These are stored in a sqlite database, which we can search from. You can assign conversions to playlists, and then play them and record them (using OBS and (eventually) dolphin frame dump and super eventually upload them to gfycat). There are several settings that need to be set. 


TODO (no particular order):
Refactor playlist page to use Material UI
Add persistent ordering of conversions in playlists, that can be changed by user
Add option for choosing between OBS recording and dolphin framedumps  
Add option for gfycat uploading  
Add option for recordings of playlists to be split into different files  
More search options (search based on moves in conversion, etc)  
Game/converion stat breakdown
analysis of playlists to predict/suggest additions  
Make the code consisent and look sane

ISSUES:
Load up is very slow
First search call is slow
Need to restart conversion-load process when replay path is set

