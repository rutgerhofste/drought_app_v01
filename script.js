// Rutger Hofste 2018-08-03
// Github: https://github.com/rutgerhofste/drought_app_vo1
// Public URL: https://rutgerhofste.users.earthengine.app/view/droughtappv01
// add to URL ?summit_preview&accept_repo=users/lks/ee-103

var ic_s2 = ee.ImageCollection("COPERNICUS/S2"),
    ic_ls8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");


// ------------- Settings ---------------

// Incl.
var month_min = 7
var month_max = 7
var year_min = 2015


// -------------Sentinel 2 --------------

var ivp_s2 = {"opacity":1,"bands":["B4","B3","B2"],"min":0,"max":0.3,"gamma":1};
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

// Filter all historial July's (2015-2017)
var ic_s2_hist = ic_s2.filter(ee.Filter.calendarRange(month_min,month_max, "month"))
                      .filter(ee.Filter.calendarRange(2014, 2017, "year"))

var ic_s2_2018 = ic_s2.filter(ee.Filter.calendarRange(month_min, month_max, "month"))
                      .filter(ee.Filter.calendarRange(2018, 2018, "year"))


// Using slightly higher cloudy threshold since shorter period and 
// dry (clear skies?) month.
var s2_composite_2018 = ic_s2_2018
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
                  .map(maskS2clouds)
                  .median();

var s2_composite_hist = ic_s2_hist
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


var ic_ls8_hist = ic_ls8.filter(ee.Filter.calendarRange(month_min, month_max, "month"))
                        .filter(ee.Filter.calendarRange(2014, 2017, "year"))
var ic_ls8_2018 = ic_ls8.filter(ee.Filter.calendarRange(month_min, month_max, "month"))
                        .filter(ee.Filter.calendarRange(2018, 2018, "year"))

print(ic_ls8_hist.limit(10))

var ls8_composite_hist = ic_ls8_hist.map(compositeFunctionSR)
                                    .median();
var ls8_composite_2018 = ic_ls8_2018.map(compositeFunctionSR)
                                    .median();

print(ls8_composite_2018)

// ------------- UI stuff  --------------


// Control/Info panel

var title = ui.Label("Historic Drought in the Netherlands")
title.style().set('color', '#51504b');
title.style().set('fontWeight', 'bold');
title.style().set({
  fontSize: '20px',
  padding: '10px'
});

var description = ui.Label("The summer of 2018 has been extremely dry. Satellite imagery (landsat8) for July reveals the potentially devastating effect on the landscape. Check out how brown the 2018 land (right) is compared to previous years(left). ")


var disclaimer = ui.Label(" Created 2018/08/03 by Rutger Hofste. Created for fun and not for scientific purposes. Code and licence on Github: https://github.com/rutgerhofste/drought_app_v01  ")
disclaimer.style().set({
  fontSize: '8px',
});


var button = ui.Button({
  label:"Got it",
  onClick: function(){
    ui.root.remove(panel)
  }
});
button.style().set('position', 'bottom-center')


var panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '300px'}
});

panel.add(title)
panel.add(description)
panel.add(disclaimer)
panel.add(button)



// Set a center and zoom level.
var center = {lon: 6, lat: 52, zoom: 10};

// Create two maps.
var leftMap = ui.Map(center);
var rightMap = ui.Map(center);
// Remove UI controls from both maps, but leave zoom control on the left map.
leftMap.setControlVisibility(false);
rightMap.setControlVisibility(false);
leftMap.setControlVisibility({zoomControl: true});

// Link them together.
var linker = new ui.Map.Linker([leftMap, rightMap]);

// Create a split panel with the two maps.
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true
});

// Remove the default map from the root panel.
ui.root.clear();

// Add our split panel to the root panel.
ui.root.add(panel)
ui.root.add(splitPanel);


var title_left = ui.Label("July 2014-2017 (median)")
title_left.style().set('position', 'top-left')
leftMap.add(title_left)

var title_right = ui.Label("July 2018")
title_right.style().set('position', 'top-right')
rightMap.add(title_right)


//Map.addLayer(s2_composite_hist,ivp_s2,"Sentinel-2 July 2015-2017",0,1)
//Map.addLayer(s2_composite_2018,ivp_s2,"Sentinel-2 July 2018",0,1)

leftMap.addLayer(ls8_composite_hist,ivp_s2,"Landsat-8 July 2015-2017",1,1)
rightMap.addLayer(ls8_composite_2018,ivp_s2,"Landsat-8 July 2018",1,1)

