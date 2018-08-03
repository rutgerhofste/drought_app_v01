# Simple Drought App
Visualize the effects of the historic 2018 drought in The Netherlands.

[App](https://rutgerhofste.users.earthengine.app/view/droughtappv01)

## Methodology
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



Questions/Suggestions/Additions?  
Fork repo on Github please. 

