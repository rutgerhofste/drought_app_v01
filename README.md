# 2019 update
Images and scripts updated for 2019
https://github.com/rutgerhofste/drought_app_v01/blob/master/gelderlander_2019_v01.js

Suggested citations:
Script by Rutger Hofste, available at https://github.com/rutgerhofste/drought_app_v01
Data available from the U.S. Geological Survey.
Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. Remote Sensing of Environment.

Description:
As input data I've used satelite imagery form  USGS Landsat 8 Collection 1 Tier 1 TOA Reflectance. 
Using the latest available date (July 19th) and a lookback period of 90 days, I masked out clouds and shadows and create
three images: 2019, 2018 and pre. The pre image is using data from 2014-2017. 

In the post-processing step I clipped the data to Gelderland province and visualized bands 4,3,2 [0 - 0.3]. 

Earthengine script:
Y2019M08D02_RH_Gelderlander_v01
https://code.earthengine.google.com/6129f8f5241154a1054592b14737d20e
https://github.com/rutgerhofste/drought_app_v01/blob/master/gelderlander_2019_v01.js


# Simple Drought App
Visualize the effects of the historic 2018 drought in The Netherlands.

[Dashboard](https://datastudio.google.com/open/13toeHatvw6cg4R741Euue5GtVlRJX2tK)  
[Satellite App](https://rutgerhofste.users.earthengine.app/view/droughtappv01)  
[Results App](https://rutgerhofste.carto.com/builder/5f366148-d967-4136-a9c9-efb7e13307b1/embed)  

## Methodology to create map
The app uses data from landsat-8. Landsat-8 has a revisit time of 16 days and like many staelilites in the visual spectrum cannot see through clouds. Processing of the data is as follows:

### Step 1
Landsat-8 data is filtered by month (July) 

### Step 2
For the left panel data is filtered by years 2014-2017.  
For the right panel data is filtered by years 2018. 

### Step 3 
Clouds and shadows are removed using cloud mask and shadow mask (see script)

### Step 4
Take the median for all remaining valid pixels. 

The number of valid pixels varies per location but ranges from 0 to 6 for 2018 and 0 to 10 for 2014 - 2017. Invalid pixels have been masked out. 

## Methodology to calculate greenness per municipality 
start with the same methodology as for map.

### step 5
per pixel, calculate greenness as defined by greenness = G / (R+G+B) where R, G, B are the Red, Green and Blue bands of the landsat 8 surface refectance [product](https://code.earthengine.google.com/dataset/LANDSAT/LC08/C01/T2_SR).  

### step 7 
calculate the difference in greenness between July 2018 and the median of 2014-2017. greenness_difference = (greenness_2018-greenness_2014_2017)/greenness_2014_2017

### step 8  
calculate the average per municipality.  


Questions/Suggestions/Additions?  
Fork repo on Github please. 

