// Script for earthengine
// https://code.earthengine.google.com/6129f8f5241154a1054592b14737d20e
// Y2019M08D02_RH_Gelderlander_v01 

var aoi = /* color: #0b4a8b */ee.Geometry.Polygon(
        [[[4.7625732421875, 51.57706953722565],
          [7.05322265625, 51.56682701546231],
          [6.950797149790787, 52.15822501129717],
          [6.8994140625, 52.59971122365476],
          [5.3887939453125, 52.54295506642128]]])

 
// ------------- Inputs ---------------

// Define range in days to use since today. 
var window_lookback = 90; // in days in version 1 we use 90 days, version 2 60
var now = new Date("2019-07-19"); // based on data availability on 2019 08 02 for ls8 toa sr 1
var end = ee.Date(now);
var start = end.advance(window_lookback*-1,"day")

print(start,end)

// Incl.
var day_start = start.get("day")
var day_end =  end.get("day")
var month_start = start.get("month")
var month_end =  end.get("month")

// Year to include for historic mosaics
var year_2019 = 2019
var year_2018 = 2018

var year_pre_min = 2014
var year_pre_max = 2017


var ivp_s2 = {"opacity":1,"bands":["B4","B3","B2"],"min":0,"max":0.2,"gamma":1.2};


// -------------Landsat 8 --------------

var ic_ls8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR");

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
var ic_ls8_2018 = ic_ls8.filter(ee.Filter.calendarRange(month_start, month_end, "month"))
                                    .filter(ee.Filter.calendarRange(year_2018, year_2018, "year"))
var ic_ls8_2019 = ic_ls8.filter(ee.Filter.calendarRange(month_start, month_end, "month"))
                                  .filter(ee.Filter.calendarRange(year_2019, year_2019, "year"))

var ls8_composite_pre = ic_ls8_pre.map(compositeFunctionSR)
                                    .median();
var ls8_composite_2018 = ic_ls8_2018.map(compositeFunctionSR)
                                    .median();
var ls8_composite_2019 = ic_ls8_2019.map(compositeFunctionSR)
                                    .median();
                                    
Map.addLayer( ls8_composite_2019, ivp_s2,"2019")
Map.addLayer( ls8_composite_2018, ivp_s2,"2018")
Map.addLayer( ls8_composite_pre, ivp_s2,"pre")
Map.addLayer(aoi)

var ls8_composite_2019 = ls8_composite_2019.clip(aoi).select(["B4","B3","B2"])
var ls8_composite_2018 = ls8_composite_2018.clip(aoi).select(["B4","B3","B2"])
var ls8_composite_pre = ls8_composite_pre.clip(aoi).select(["B4","B3","B2"])

Export.image.toCloudStorage({image:ls8_composite_2019,
                            description:"ls8_composite_2019_100m_v01",
                            bucket:"aqueduct30_v01",
                            scale:100,
                            fileNamePrefix:"Y2019M08D02_RH_Gelderlander_v01/output_V02/ls8_composite_2019_100m_v01",
                            fileFormat:"GeoTIFF",
                            maxPixels:1e11,
                            region:aoi
      })

Export.image.toCloudStorage({image:ls8_composite_2018,
                            description:"ls8_composite_2018_100m_v01",
                            bucket:"aqueduct30_v01",
                            scale:100,
                            fileNamePrefix:"Y2019M08D02_RH_Gelderlander_v01/output_V02/ls8_composite_2018_100m_v01",
                            fileFormat:"GeoTIFF",
                            maxPixels:1e11,
                            region:aoi
      })

Export.image.toCloudStorage({image:ls8_composite_pre,
                            description:"ls8_composite_pre_100m_v01",
                            bucket:"aqueduct30_v01",
                            scale:100,
                            fileNamePrefix:"Y2019M08D02_RH_Gelderlander_v01/output_V02/ls8_composite_pre_100m_v01",
                            fileFormat:"GeoTIFF",
                            maxPixels:1e11,
                            region:aoi
      })



