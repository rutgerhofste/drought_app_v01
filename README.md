# Simple Drought App
Visualize the effects of the historic 2018 drought in The Netherlands.

[App](https://rutgerhofste.users.earthengine.app/view/droughtappv01)

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

Data for year 2018 is often based on two images whereas the historic data is based on appr. 9 images. 

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

