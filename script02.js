// Initial Commit: 2018-08-03
// App created by: Rutger Hofste, add your name here. 
// Github: https://github.com/rutgerhofste/drought_app_v01
// Public URL: https://rutgerhofste.users.earthengine.app/view/droughtappv01
// Add to URL to enable splitpanel https://code.earthengine.google.com/?summit_preview&accept_repo=users/lks/ee-103
// ee repo URL: https://earthengine.googlesource.com/users/rutgerhofste/drought_app_v01 

/* ee_community to the rescue

Europe is currently experiencing an unprecedented drought and how yellow the fields have become is the talk of the town.
As the geospatial community we arof this scale. 

It is our duty to get the wealth of remote sensing information in the hands of people without access to earthengine or 
the bigdata processing capacity in general.  I would therefore ask the community (that's you!) to jointly build a simple app for the general 
public to better understand the historic drought of 2018 in Northwestern Europe.  This project can take many shapes and everyone should feel 
free to tailor this script to fit his/her objective. This is not my project, this is everyone's project. 

For a minimum viable product:

1.
People care about their own backyard first before getting worried about a drought on the other side of the continent, therefore I wanted to
start with national apps (Netherlands) with the possibility to look at your backyard, literally. 

2. 
Droughts and climate are hard to understand. This app tries to keep scientific approaches to a minimum. 
Rather than comparing a log(NDVI_after)/log(NDVI_before) this app focuses on the simple. Greenness, Rainfall etc. ELI5

How to contribute:
simple: Github repo (https://github.com/rutgerhofste/drought_app_v01), add/modify the code and create pull requests. 

best,

Rutger Hofste


*/ 


/* App description

- Filter, clean and mosaic Sentinal 2 and landsat 8 
- Obtain a before and after mosaic based on user-input or pre-defined
  Currently the script compares July 2018 with the median of Julys 2014,2015,2016 and 2017
- Calculate before and after greenness images, diffence

TODO:
- Reduce Region per province or municipality (GADM level 1, GADM level 2)
- Create UI

*/


// Sentinel 2 MSI and landsat8 Surface Reflectance (add sentinel 3?)
// Sentinel 2 not used due to imperfect cloud removal strategy. 
var ic_s2 = ee.ImageCollection("COPERNICUS/S2"),
    ic_ls8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");

var gadm36_NLD_0 = ee.FeatureCollection("users/rutgerhofste/drought_app_v01/gadm36_NLD_0");
var gadm36_NLD_1 = ee.FeatureCollection("users/rutgerhofste/drought_app_v01/gadm36_NLD_1");
var gadm36_NLD_2 = ee.FeatureCollection("users/rutgerhofste/drought_app_v01/gadm36_NLD_2");

//remove IJsselmeer and Zeeuwse meren since these are not provinces. 
function removeNonProvince(fc){
  var fc_out = fc
  fc_out = fc_out.filterMetadata("NAME_1","not_equals","IJsselmeer")
  fc_out = fc_out.filterMetadata("NAME_1","not_equals","Zeeuwse meren")
  return fc_out
}

gadm36_NLD_1 = removeNonProvince(gadm36_NLD_1)
gadm36_NLD_2 = removeNonProvince(gadm36_NLD_2)

var ivp_s2 = {"opacity":1,"bands":["B4","B3","B2"],"min":0,"max":0.2,"gamma":1.2};



// ------------- Inputs ---------------

// Define range in days to use since today. 
var window_lookback = 31; // in days

var now = new Date();
var end = ee.Date(now);
var start = end.advance(window_lookback*-1,"day")

print(start,end)

// Incl.
var day_start = start.get("day")
var day_end =  end.get("day")
var month_start = start.get("month")
var month_end =  end.get("month")

// Year to include for historic mosaics
var year_post = ee.Date(now).get("year")

var year_pre_min = 2015
var year_pre_max = year_post.subtract(1)


// -------------Sentinel 2 --------------

var rgb_bands_s2 = ["B4","B3","B2","QA60"]
var ic_s2_sel = ic_s2.select(rgb_bands_s2)

// Code from Google Group kudos to Nick Clinton
// Function to mask clouds using the Sentinel-2 QA band.
function maskS2clouds(image) {
  var qa = image.select('QA60');
  
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = Math.pow(2, 10);
  var cirrusBitMask = Math.pow(2, 11);
  
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data.
  return image.updateMask(mask).divide(10000);
}

// Filter all historial July's
var ic_s2_pre = ic_s2.filter(ee.Filter.calendarRange(month_start,month_end, "month"))
                      .filter(ee.Filter.calendarRange(year_pre_min, year_pre_max, "year"))

var ic_s2_post = ic_s2.filter(ee.Filter.calendarRange(month_start, month_end, "month"))
                      .filter(ee.Filter.calendarRange(year_post, year_post, "year"))

// Using slightly higher cloudy threshold since shorter period and 
// dry (clear skies?) month.
var s2_composite_post = ic_s2_post
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
                  .map(maskS2clouds)
                  .median();

var s2_composite_pre = ic_s2_pre
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
                  .map(maskS2clouds)
                  .median();

// -------------Landsat 8 --------------

// Function to composite Landsat 8 SR imagery.
var compositeFunctionSR = function(image) {
  
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = ee.Number(2).pow(3).int();
  var cloudsBitMask = ee.Number(2).pow(5).int();
  
  var qa = image.select('pixel_qa');
  
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0).and(
            qa.bitwiseAnd(cloudsBitMask).eq(0));
  
  // We may want these later.
  // var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  // var ndwi = image.normalizedDifference(['B3', 'B5']).rename('NDWI');
  // var ndbi = image.normalizedDifference(['B6', 'B5']).rename('NDBI');
  // var indexMax = ndvi.max(ndwi).max(ndbi).rename('indexMax');

  return image
      // Scale the data to reflectance and temperature.
      .select(['B[1-7]']).multiply(0.0001)
      .addBands(image.select(['B10', 'B11']).multiply(0.1))
      .updateMask(mask);
};


var ic_ls8_pre = ic_ls8.filter(ee.Filter.calendarRange(month_start,month_end, "month"))
                                    .filter(ee.Filter.calendarRange(year_pre_min, year_pre_max, "year"))
var ic_ls8_post = ic_ls8.filter(ee.Filter.calendarRange(month_start, month_end, "month"))
                                    .filter(ee.Filter.calendarRange(year_post, year_post, "year"))

var ls8_composite_pre = ic_ls8_pre.map(compositeFunctionSR)
                                    .median();
var ls8_composite_post = ic_ls8_post.map(compositeFunctionSR)
                                    .median();


// ------------- Landsat 8 Greenness--------------
// This app is meant to be very simple so no NDVI, EVI etc. just greenness


var ls_8_greenness_pre = ls8_composite_pre.expression("G/(R+G+B)",
  {"R":ls8_composite_pre.select("B4"),
   "G":ls8_composite_pre.select("B3"),
   "B":ls8_composite_pre.select("B2")
  })
  
var ls_8_greenness_post = ls8_composite_post.expression("G/(R+G+B)",
  {"R":ls8_composite_post.select("B4"),
   "G":ls8_composite_post.select("B3"),
   "B":ls8_composite_post.select("B2")
  })






// Percentage difference in greenness

var ls_8_greenness_diff = ((ls_8_greenness_post.subtract(ls_8_greenness_pre)).divide(ls_8_greenness_pre)).multiply(100)
ls_8_greenness_diff = ls_8_greenness_diff.select(["B3"],["greenness_diff"])


// Zonal Statistics

// running into memory issues, using reduceRegion instead of reduceRegions

function reduceRegionsCustom(feature){
    var geometry= feature.geometry()
    var dict = ls_8_greenness_diff.reduceRegion({reducer:ee.Reducer.mean(),
                                                geometry:geometry,
                                                scale:1000,
                                                bestEffort:false,
                                                maxPixels:1e10,
                                                tileScale:1})
    var mean = dict.get("greenness_diff")    
    var feature_out = ee.Feature(feature)
    feature_out = feature_out.set("greenness_diff",mean)
    return feature_out
}

var fc_greenness_diff_gadm36_NLD_1 = gadm36_NLD_1.map(reduceRegionsCustom)
fc_greenness_diff_gadm36_NLD_1 = fc_greenness_diff_gadm36_NLD_1.sort("greenness_diff",true)

var fc_greenness_diff_gadm36_NLD_2 = gadm36_NLD_2.map(reduceRegionsCustom)

Export.table.toDrive({collection:fc_greenness_diff_gadm36_NLD_1,
                      description:"fc_greenness_diff_gadm36_NLD_1",
                      folder:"eeexport",
                      fileNamePrefix:"fc_greenness_diff_gadm36_NLD_1",
                      fileFormat:"CSV",
                      selectors:["NAME_1","greenness_diff"]
})
Export.table.toDrive({collection:fc_greenness_diff_gadm36_NLD_2,
                      description:"fc_greenness_diff_gadm36_NLD_2",
                      folder:"eeexport",
                      fileNamePrefix:"fc_greenness_diff_gadm36_NLD_2",
                      fileFormat:"CSV",
                      selectors:["NAME_1","NAME_2","greenness_diff"]
})

fc_greenness_diff_gadm36_NLD_2 = fc_greenness_diff_gadm36_NLD_2.limit(500,"greenness_diff",true)

                                              
var chart_greenness_diff_gadm36_NLD_1 = ui.Chart.feature.byFeature({features:fc_greenness_diff_gadm36_NLD_1,
                                                                    xProperty:"NAME_1",
                                                                    yProperties:"greenness_diff"})

chart_greenness_diff_gadm36_NLD_1.setChartType("BarChart")
var options_gadm36_NLD_1 = {
  width: "100%",
  height: 500,
};
chart_greenness_diff_gadm36_NLD_1.setOptions(options_gadm36_NLD_1)


var chart_greenness_diff_gadm36_NLD_2 = ui.Chart.feature.byFeature({features:fc_greenness_diff_gadm36_NLD_2,
                                                                    xProperty:"NAME_2",
                                                                    yProperties:"greenness_diff"})

chart_greenness_diff_gadm36_NLD_2.setChartType("BarChart")
var options_gadm36_NLD_2 = {
  width: "100%",
  height: 2000,
  vAxis: {
    textStyle : {
      fontSize : 7
    }
  }
};
chart_greenness_diff_gadm36_NLD_2.setOptions(options_gadm36_NLD_2)




// ------------- UI stuff  --------------


// Control/Info panel

var title = ui.Label("Extreme Drought in the Netherlands")
title.style().set('color', '#51504b');
title.style().set('fontWeight', 'bold');
title.style().set({
  fontSize: '20px',
  padding: '10px'
});

var description = ui.Label("The summer of 2018 has been extremely dry. Satellite imagery (landsat8) for July reveals the potentially devastating effect on the landscape. Check out how brown the 2018 land (right) is compared to previous years(left). ")
var description2 = ui.Label("The map on the right is created by taking all July 2018 data and remove clouds and shadows. The map on the left is the median value of the cloud, and shadow-free pixels of July 2014, July 2015, July 2016 and July 2017.")


var disclaimer = ui.Label(" Created 2018/08/03 by Rutger Hofste. Created for fun and not for scientific purposes. Code and licence on Github: https://github.com/rutgerhofste/drought_app_v01  ")
disclaimer.style().set({
  fontSize: '12px',
});


var button_mobile = ui.Button({
  label:"Mobile",
  onClick: function(){
    ui.root.remove(panel)
    ui.root.add(panel2)
  }
});
button_mobile.style().set('position', 'bottom-left')

var button_desktop = ui.Button({
  label:"Desktop",
  onClick: function(){
    ui.root.remove(panel)
    ui.root.add(panel2)
  }
});
button_desktop.style().set('position', 'bottom-right')


var title2 = ui.Label("Rankings")
title2.style().set('color', '#51504b');
title2.style().set('fontWeight', 'bold');
title2.style().set({
  fontSize: '20px',
  padding: '10px'
});
var description3 = ui.Label("% difference in greenness per province and municipality (takes some time to calculate)")

var panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '500px'}
});

panel.add(title)
panel.add(description)
panel.add(description2)
panel.add(disclaimer)
panel.add(button_mobile)
panel.add(button_desktop)


// Panel 2 ------
var panel2 = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '100%'}
});



var panel2_control_next_button = ui.Button({
  label:"next",
  onClick: function(){
    ui.root.remove(panel2)
    ui.root.add(panel3)
  }
});

panel2.add(title2)
panel2.add(description3)
panel2.add(chart_greenness_diff_gadm36_NLD_1)
panel2.add(panel2_control_next_button)


// Panel 3 ----- 

var panel3 = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '500px'}
});

// Set a center and zoom level.
var center = {lon: 6, lat: 52, zoom: 10};

// Create two maps.
var leftMap = ui.Map(center);
var rightMap = ui.Map(center);
// Remove UI controls from both maps, but leave zoom control on the left map.
//leftMap.setControlVisibility(false);
//rightMap.setControlVisibility(false);
//leftMap.setControlVisibility({zoomControl: true});


// Interactivity
function setStyleHighLight(feature){
  feature = ee.Feature(feature)
  feature = feature.set("style",{"fillColor":"#FFFFFF00",
                                 "width":3
  }) 
  return feature;
}


function getMunicipality(coords){
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  var fc_sel = gadm36_NLD_2.filterBounds(point)
  fc_sel = fc_sel.map(setStyleHighLight)
  print(fc_sel.first().get("NAME_2"))
  print(fc_sel)
  leftMap.layers().set(2,ui.Map.Layer(fc_sel.style({styleProperty: "style"})))
  rightMap.layers().set(2,ui.Map.Layer(fc_sel.style({styleProperty: "style"})))
}


leftMap.onClick(getMunicipality)



// Link them together.
var linker = new ui.Map.Linker([leftMap, rightMap]);

// Create a split panel with the two maps.
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true
});

panel3.add(splitPanel)

// Remove the default map from the root panel.
ui.root.clear();

// Add our split panel to the root panel.
//ui.root.add(panel)
//ui.root.add(splitPanel);
//ui.root.add(panel2)


var title_left = ui.Label("July 2014-2017 (median)")
title_left.style().set('position', 'top-left')
leftMap.add(title_left)

var title_right = ui.Label("July 2018")
title_right.style().set('position', 'top-right')
rightMap.add(title_right)



var left_layer0 = ui.Map.Layer(ls8_composite_pre,ivp_s2,"Landsat-8 July 2015-2017",1,1);
leftMap.layers().set(0,left_layer0)

var right_layer0 = ui.Map.Layer(ls8_composite_post,ivp_s2,"Landsat-8 July 2018",1,1)
rightMap.layers().set(0,right_layer0)



// Add Municipality for reference 


function setStyle(feature){
  feature = ee.Feature(feature)
  feature = feature.set("style",{"fillColor":"#FFFFFF00",
                                 "width":0.1
  }) 
  return feature;
}

gadm36_NLD_2 = gadm36_NLD_2.map(setStyle)

var left_layer1 = ui.Map.Layer(gadm36_NLD_2.style({styleProperty: "style"}),{},"gadm36_NLD_2")
leftMap.layers().set(1,left_layer1)

var right_layer1 = ui.Map.Layer(gadm36_NLD_2.style({styleProperty: "style"}),{},"gadm36_NLD_2")
rightMap.layers().set(1,right_layer1)

