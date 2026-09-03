# 🔗 LINKS.md — Exhaustive Data Source & Tooling Directory

> **SIH Dynamic ETA for Indian Railways — Phase 0 Data Ingestion Reference**
> Compiled: 2026-08-28 | Organized by data category for the [Phase0_Research_Plan.md](./Phase0_Research_Plan.md)

---

## Table of Contents

1. [Track Geometry & Geospatial Data](#1-track-geometry--geospatial-data)
2. [Elevation / DEM Data](#2-elevation--dem-data)
3. [Timetable & Schedule Data](#3-timetable--schedule-data)
4. [GTFS Feeds & Converters](#4-gtfs-feeds--converters)
5. [Historical Delay Datasets (Kaggle)](#5-historical-delay-datasets-kaggle)
6. [NTES Scraping Tools & Live Data](#6-ntes-scraping-tools--live-data)
7. [Third-Party Railway APIs](#7-third-party-railway-apis)
8. [Weather & Climate Data](#8-weather--climate-data)
9. [Fog & Visibility Data (North India)](#9-fog--visibility-data-north-india)
10. [Satellite Imagery & Remote Sensing](#10-satellite-imagery--remote-sensing)
11. [Flood & Disaster Data](#11-flood--disaster-data)
12. [Air Quality Data (Visibility Proxy)](#12-air-quality-data-visibility-proxy)
13. [Government Portals & Official Reports](#13-government-portals--official-reports)
14. [Railway Simulation Frameworks](#14-railway-simulation-frameworks)
15. [ML Model Implementations (Delay Prediction)](#15-ml-model-implementations-delay-prediction)
16. [Spatio-Temporal & Graph ML Libraries](#16-spatio-temporal--graph-ml-libraries)
17. [Time-Series Forecasting Libraries](#17-time-series-forecasting-libraries)
18. [Conformal Prediction & Uncertainty Libraries](#18-conformal-prediction--uncertainty-libraries)
19. [Feature Engineering Tools](#19-feature-engineering-tools)
20. [GTFS Processing Libraries](#20-gtfs-processing-libraries)
21. [Streaming & Real-Time Frameworks](#21-streaming--real-time-frameworks)
22. [GIS & Climate Python Libraries](#22-gis--climate-python-libraries)
23. [Indian Railways ML Research Repos](#23-indian-railways-ml-research-repos)
24. [Academic Paper Code Repositories](#24-academic-paper-code-repositories)
25. [CAG Audit Reports (Punctuality)](#25-cag-audit-reports-punctuality)

---

## 1. Track Geometry & Geospatial Data

### OpenStreetMap (OSM) Bulk Downloads

| Source | URL | Format | Notes |
|:--|:--|:--|:--|
| **Geofabrik India PBF** | https://download.geofabrik.de/asia/india-latest.osm.pbf | `.osm.pbf` (~1.5–2 GB) | Complete daily-updated OSM snapshot for India. Filter with `osmium`. |
| **Geofabrik India Page** | https://download.geofabrik.de/asia/india.html | Multiple formats | Sub-region downloads available. |
| **BBBike Custom Extracts** | https://extract.bbbike.org/ | GeoJSON, Shapefile, PBF, SQLite | Custom bounding-box extracts for any corridor. |

### OSM Live Query (Overpass API)

| Source | URL | Notes |
|:--|:--|:--|
| **Overpass Turbo (Web UI)** | https://overpass-turbo.eu/ | Interactive query builder with export to GeoJSON/KML. |
| **Overpass API Endpoint** | `https://overpass-api.de/api/interpreter` | POST Overpass QL queries; returns JSON/XML. |

<details>
<summary><b>📝 Overpass QL: All Indian Railway Tracks</b></summary>

```overpass
[out:json][timeout:180];
area["ISO3166-1"="IN"][admin_level=2]->.searchArea;
(
  way["railway"~"rail|narrow_gauge|light_rail|subway"](area.searchArea);
);
out body; >; out skel qt;
```
</details>

<details>
<summary><b>📝 Overpass QL: All Stations, Junctions, Halts</b></summary>

```overpass
[out:json][timeout:120];
area["ISO3166-1"="IN"][admin_level=2]->.searchArea;
(
  node["railway"~"station|halt|junction"](area.searchArea);
  way["railway"~"station|halt|junction"](area.searchArea);
);
out body; >; out skel qt;
```
</details>

<details>
<summary><b>📝 Overpass QL: Electrified Tracks Only (25kV AC)</b></summary>

```overpass
[out:json][timeout:180];
area["ISO3166-1"="IN"][admin_level=2]->.searchArea;
(
  way["railway"="rail"]["electrified"~"yes|contact_line"](area.searchArea);
);
out body; >; out skel qt;
```
</details>

<details>
<summary><b>📝 Overpass QL: Signals, Switches, Level Crossings</b></summary>

```overpass
[out:json][timeout:120];
area["ISO3166-1"="IN"][admin_level=2]->.searchArea;
(
  node["railway"~"signal|switch|level_crossing|buffer_stop"](area.searchArea);
);
out body; >; out skel qt;
```
</details>

### Pre-Extracted Railway GIS Layers

| Source | URL | Format | Notes |
|:--|:--|:--|:--|
| **HOT India Railways (HDX)** | https://data.humdata.org/dataset/hotosm_ind_railways | GeoPackage, Shapefile, GeoJSON, KML | Pre-cleaned railway lines & points. No auth needed. |
| **OpenRailwayMap** | https://www.openrailwaymap.org/ | Web tiles (XYZ), Vector | Interactive map: gauge, electrification, speed limits, signaling layers. |
| **OpenRailwayMap Tiles** | `https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png` | XYZ Raster | Also `/electrified/`, `/maxspeed/`, `/signals/` tile layers. |

### GitHub Repos: Station Coordinates, Track Geometry, Network Graphs

| Repo | URL | Format | Contents |
|:--|:--|:--|:--|
| **DataMeet Railways** | https://github.com/datameet/railways | GeoJSON, Shapefile, CSV | ~8,000 stations with lat/lon, codes, zones. `stations.json`, `trains.json`. |
| **Yashveer India Geodata** | https://github.com/yashveeeeeeer/india-geodata | Shapefile, Parquet, FlatGeobuf | Railway lines, stations, state/district boundaries. |
| **CivicTech India GeoJSON** | https://github.com/civictech-India/INDIA-GEO-JSON-Datasets | GeoJSON | `stations_geo.json`, `trains_geo.json` for Leaflet/Mapbox. |
| **IR Network Graph** | https://github.com/AyushiKashyapp/indian_railways_network | GeoJSON, NetworkX, CSV | Adjacency graph of Indian railway track network. |
| **Indian Shapefiles** | https://github.com/datta07/INDIAN-SHAPEFILES | ESRI Shapefile | Transport infrastructure centerlines, junctions. |
| **OSM2Rail** | https://github.com/jiawei92/OSM2Rail | Python / Graph models | Converts OSM railway data to routable topological graph. |
| **RailPull (Track Generator)** | https://github.com/shwetankg07/railpull | Python, GeoJSON | Pairs NTES schedules with OSM geometry for route LineStrings. |

### GitHub Gists: Station GeoJSON

| Gist | URL | Format |
|:--|:--|:--|
| **Sankalp Sharma IR Stations** | https://gist.github.com/sankalpsharmaa/0c0587f3ae31277411960f70128d682f | GeoJSON |

### Kaggle: Station Coordinates & Track Maps

| Dataset | URL | Format |
|:--|:--|:--|
| **IR Stations & Routing Network** (Mansi Aggarwal) | https://www.kaggle.com/datasets/mansiaggarwal88/indian-railway-stations-and-routing-network | CSV (~8,990 stations with lat/lon, zone, junction status) |
| **IR Dataset** (Sripaad Srinivasan) | https://www.kaggle.com/datasets/sripaadsrinivasan/indian-railways-dataset | GeoJSON, JSON |
| **IR Stations Codes & Facilities** (Arun Jangir) | https://www.kaggle.com/datasets/arunjangir245/indian-railway-stations-codes-facilities-data | CSV |
| **IR Stations & Schedules** (Dheeraj Pai) | https://www.kaggle.com/datasets/dheerajmpai/indian-railway-dataset | CSV, JSON |
| **IR Geospatial EDA Notebook** (Aditi Khare) | https://www.kaggle.com/code/aditikhare/indian-railways-eda | Jupyter Notebook |

### Government GIS Portals

| Portal | URL | Format | Notes |
|:--|:--|:--|:--|
| **ISRO Bhuvan** | https://bhuvan.nrsc.gov.in/ | WMS/WFS, GeoTIFF | Satellite imagery, LULC, CartoDEM, transport overlays. |
| **Bhuvan Open Data (NOEDA)** | https://bhuvan-app3.nrsc.gov.in/data/ | GeoTIFF, Vector | CartoDEM, Resourcesat imagery, flood shapefiles. |
| **Bhuvan WMS Endpoint** | `https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms` | OGC WMS | Connect via QGIS/ArcGIS. |
| **Survey of India (SOI)** | https://onlinemaps.surveyofindia.gov.in/ | GeoPDF, PDF | Official "Railway Map of India", 1:50K topo sheets. |
| **data.gov.in Station Codes** | https://data.gov.in/ | CSV | ~8,000+ stations with lat/lon. |
| **IRCEP / IR-GIS** | https://ircep.gov.in/ | Enterprise Web GIS | Track/Bridge/Tunnel Management System (restricted full layers). |
| **Rail Drishti** | https://raildrishti.in/ | Web Dashboard | Live map of train movements, maintenance projects. |
| **PM Gati Shakti / Bharatmaps** | https://gatishakti.gov.in/ / https://bharatmaps.gov.in/ | Multi-layer GIS | Railway + highway + port multi-modal infrastructure. |
| **NESDR (NE India)** | https://www.nesdr.gov.in/ | GeoJSON, Shapefile, WMS | NE Railway network spatial layers. |
| **Wikimedia Railway Maps** | https://commons.wikimedia.org/wiki/Category:Railway_maps_of_India | SVG, PNG | Vector zone/division maps (CC-BY-SA). |

### Electrification & Zone Maps

| Source | URL | Format |
|:--|:--|:--|
| **CORE (Railway Electrification)** | https://core.indianrailways.gov.in/ | PDF, System Maps |
| **OpenRailwayMap Electrification** | https://www.openrailwaymap.org/ (Electrification layer) | Web Map |
| **SOI Zone/Division Maps** | https://onlinemaps.surveyofindia.gov.in/ | GeoPDF |

---

## 2. Elevation / DEM Data

| Source | URL | Resolution | Format | Access |
|:--|:--|:--|:--|:--|
| **SRTM 30m (USGS)** | https://earthexplorer.usgs.gov/ | 30m | GeoTIFF, HGT | Free (NASA Earthdata login) |
| **SRTM 30m Interactive Tiles** | https://dwtkns.com/srtm30m/ | 30m | HGT | Direct click-download |
| **SRTM on OpenTopography** | https://portal.opentopography.org/raster?opentopoID=OTSRTM.042014.4326.1 | 30m | GeoTIFF | Free (OpenTopo account) |
| **ASTER GDEM v3** | https://search.earthdata.nasa.gov/search?q=ASTGTM_003 | 30m | GeoTIFF | Free (NASA Earthdata login) |
| **Copernicus DEM GLO-30** | https://registry.opendata.aws/copernicus-dem/ | 30m | Cloud-Optimized GeoTIFF | **No auth required** on AWS S3 |
| **Copernicus DEM (S3 Bucket)** | `s3://copernicus-dem-30m/` | 30m | COG | `aws s3 cp --no-sign-request ...` |
| **Copernicus DEM on OpenTopo** | https://portal.opentopography.org/raster?opentopoID=OTSDEM.032021.4326.1 | 30m | GeoTIFF | Free |
| **OpenTopography REST API** | https://portal.opentopography.org/API/globaldem | 30m | GeoTIFF | Free API key |
| **Bhuvan CartoDEM (ISRO)** | https://bhuvan-app3.nrsc.gov.in/data/ | 30m/10m | GeoTIFF | Free (Bhuvan account) |
| **NASA Earthdata Search** | https://search.earthdata.nasa.gov/ | Multiple | Multiple | Free (Earthdata login) |

---

## 3. Timetable & Schedule Data

### Official Government Sources

| Source | URL | Format | Coverage |
|:--|:--|:--|:--|
| **data.gov.in IR Timetable** | https://data.gov.in/catalog/indian-railways-time-table-trains | CSV, JSON | Pan-India; 11,000+ trains, 186K+ route stops |
| **data.gov.in Ministry of Railways** | https://data.gov.in/ministrydepartment/ministry-railways | CSV, XLS, JSON, XML | Operational metrics, route-km, zonal performance |
| **data.gov.in Train Accidents** | https://data.gov.in/catalog/consequential-train-accidents-indian-railways | CSV/XLS | Historical accident logs affecting operations |
| **"Trains at a Glance" (TAAG)** | https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366,537 | PDF | Official timetable: all zones, all train categories |
| **IR Statistical Year Books** | https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366,554,1201,1207 | PDF | Annual zonal punctuality %, speeds, electrification |
| **Dataful (Curated IR Data)** | https://dataful.in/datasets/?q=railways | CSV, JSON | Cleaned versions of Ministry datasets |
| **India Data Portal** | https://indiadataportal.com/ | CSV, GeoJSON | Railway statistical indicators |

### Kaggle Schedule Datasets

| Dataset | URL | Format |
|:--|:--|:--|
| **IR Schedule-Prices-Availability** (Bhavya Rajdev) | https://www.kaggle.com/datasets/bhavyarajdev/indian-railways-schedulepricesavailability-data | CSV |
| **IR Trains Schedule & Routes** (Rohan Patel) | https://www.kaggle.com/datasets/rohanpatel/indian-trains-schedule-routes | JSON, CSV |
| **IR Latest Timetable** (Aniruddh Sharma) | https://www.kaggle.com/datasets/aniruddhsharma/indian-railways-latest | CSV |
| **CRIS OGD Cleaned** (Co-Learning Lounge) | https://www.kaggle.com/datasets/colearninglounge/indian-railway-dataset | CSV (11,114 trains, 186K stops) |
| **IR Dataset** (Sujay) | https://www.kaggle.com/datasets/sujay1844/indian-railways-dataset | CSV |
| **IRCTC Trains Master** | https://www.kaggle.com/datasets/saurabh00007/iriscsv | CSV |
| **IR Time Table** (Datta Sanket) | https://www.kaggle.com/datasets/dattasanket/indian-railways-time-table | CSV |
| **Vande Bharat Express** (Sourav Banerjee) | https://www.kaggle.com/datasets/iamsouravbanerjee/vande-bharat-express-dataset | CSV |

---

## 4. GTFS Feeds & Converters

| Source | URL | Format | Notes |
|:--|:--|:--|:--|
| **indianrailways-gtfs** (Neo2308) | https://github.com/Neo2308/indianrailways-gtfs | GTFS ZIP | Full pan-India static GTFS from NTES data |
| **railpull** (shwetankg07) | https://github.com/shwetankg07/railpull | CSV/JSONL + GTFS | NTES crawler + delay poller + GTFS generator |
| **datameet/railways** | https://github.com/datameet/railways | GeoJSON, CSV | 8,000+ stations, route paths |
| **Transitland** | https://www.transit.land/ | GTFS, GeoJSON, API | Indexes Indian urban/suburban feeds (no national IR GTFS) |
| **Transitland GitHub** | https://github.com/transitland/ | Python client | REST API v2: `api.transit.land/v2/rest/feeds` |
| **Mobility Database** | https://mobilitydatabase.org/ | GTFS/GTFS-RT catalog | Tracks Indian transit feed status |
| **OpenMobilityData** | https://openmobilitydata.org/ | GTFS | Community transit feed repository |
| **ChennaiGTFS** | https://github.com/ChennaiGTFS/ | GTFS | Suburban rail GTFS for Chennai/Mumbai |

---

## 5. Historical Delay Datasets (Kaggle)

| Dataset | URL | Format | Coverage |
|:--|:--|:--|:--|
| **IR Train Delays 2025** (Naijil Aji) | https://www.kaggle.com/datasets/naijilaji/indian-railways-train-delays-dataset-2025 | CSV | 1,900+ train-station combos; delay severity, punctuality % |
| **IR Delay Dataset** (Vishwas Srivastava) | https://www.kaggle.com/datasets/vishwassrivastava/indian-railway-delay-dataset | CSV | Rajdhani/Shatabdi/SF actual vs scheduled |
| **IR Delay Dataset** (Antareep Dey) | https://www.kaggle.com/datasets/antareepdey/indian-railway-delay-dataset | CSV, Parquet | 2018–2022 Golden Quadrilateral express trains |
| **IR Predict Train Delay** (Competition) | https://www.kaggle.com/competitions/indian-railways-predict-train-delay | CSV | 1.5M records, 42 features, binary >15 min classification |
| **Train Delay Dataset** (Meet Nakum) | https://www.kaggle.com/datasets/meetnakum/train-delay-dataset | CSV | ML benchmark: weather, congestion, train type features |
| **Railway Delay Dataset** (Anurag Raturi) | https://www.kaggle.com/datasets/anuragraturi/railway-delay-dataset | CSV | General delay records |
| **Train Delay Dataset** (Ravi Singh) | https://www.kaggle.com/datasets/ravisingh19/train-delay-dataset | CSV | Structured for predictive modeling |

---

## 6. NTES Scraping Tools & Live Data

### NTES Endpoints (Reverse-Engineered)

| Endpoint | URL Pattern | Returns |
|:--|:--|:--|
| **Live Running Status** | `GET https://enquiry.indianrail.gov.in/mntes/q?opt=trainRunningStatus&trainNo={NO}&date={DD-MMM-YYYY}` | Delay per intermediate station |
| **Live Station Board** | `GET https://enquiry.indianrail.gov.in/mntes/q?opt=liveStation&stationCode={STN}&hours={2|4|8}` | All trains ±N hours |
| **Train Full Schedule** | `GET https://enquiry.indianrail.gov.in/mntes/q?opt=trainSchedule&trainNo={NO}` | Complete stop sequence |
| **NTES Portal** | https://enquiry.indianrail.gov.in/mntes/ | Web UI | Public train enquiry |

### Python Scraper Packages

| Package | PyPI | GitHub | Notes |
|:--|:--|:--|:--|
| **ntes-client** | https://pypi.org/project/ntes-client/ | https://github.com/shvetank/ntes-client | Auto-decryption, running status, station boards |
| **pyinrail** | https://pypi.org/project/pyinrail/ | https://github.com/nikhilkumarsingh/pyinrail | Train routes, live status, seat availability |
| **RailKit SDK** | — | https://github.com/RAJIV81205/RailKit | NTES/IRCTC tracking, PNR, delay extraction |

### Third-Party Platform Scrapers (GitHub)

| Tool | URL | Target Platform |
|:--|:--|:--|
| **erail scraper** (smihir) | https://github.com/smihir/erail | erail.in |
| **py-trains** (g-bhagwanani) | https://github.com/g-bhagwanani/py-trains | railyatri.in |
| **TrainTrack** (Saurabh-gzp) | https://github.com/Saurabh-gzp/TrainTrack | ixigo + erail.in |
| **IxigoScraping** (debayanbose) | https://github.com/debayanbose/IxigoScraping | ixigo.com |
| **ConfirmTkt scrapers** | https://github.com/EXTREMOPHILARUM/pnr-notify-update | confirmtkt.com |
| **ConfirmTkt (yousufkidiya17)** | https://github.com/yousufkidiya17/train-travel-assistant | confirmtkt.com |

### Historical Delay Sources (Web)

| Source | URL | Coverage | Notes |
|:--|:--|:--|:--|
| **etrain.info** | https://etrain.info/ | 7/30/90-day per-train delay history | Cloudflare WAF; needs headless browser |
| **railyatri.in** | https://www.railyatri.in/ | On-time score, avg delay, platform numbers | Mobile API tokens required |
| **ixigo.com** | https://www.ixigo.com/trains | Delay probability, running history | Auth tokens required |
| **confirmtkt.com** | https://www.confirmtkt.com/ | Delay likelihood predictions | Closed platform |

---

## 7. Third-Party Railway APIs

| API | URL | Format | Pricing |
|:--|:--|:--|:--|
| **IndianRailAPI** | https://indianrailapi.com/ | REST JSON | Freemium (free dev tier) |
| **RailRadar** | https://railradar.in/ | REST / WebSocket / GeoJSON | Developer registration |
| **RailwayAPI** | https://railwayapi.com/ | REST JSON | Freemium |
| **APIClub** | https://apiclub.in/ | REST JSON | API key registration |
| **RapidAPI — IRCTC Railway** | https://rapidapi.com/nitsan.patel/api/irctc-indian-railway | REST JSON | Free tier + pay-per-call |
| **RapidAPI — IR Info** | https://rapidapi.com/dev-rail/api/indian-railway-info | REST JSON | Free tier + pay-per-call |
| **RapidAPI — IR Collection** | https://rapidapi.com/collection/indian-railway-apis | Multiple | Multiple providers |

---

## 8. Weather & Climate Data

### Free APIs (No Key Required)

| Source | URL | Resolution | Key Variables | Notes |
|:--|:--|:--|:--|:--|
| **Open-Meteo Historical** | https://open-meteo.com/en/docs/historical-weather-api | Hourly, ~9 km, 1940–present | `visibility`, `precipitation`, `temperature_2m`, `weather_code`, `wind_speed_10m` | **Primary source.** 10K calls/day free. No key. |
| **Open-Meteo Archive Endpoint** | `https://archive-api.open-meteo.com/v1/archive` | Hourly | All variables | Direct REST. |
| **Open-Meteo Forecast** | https://open-meteo.com/en/docs | Hourly, 1–16 days ahead | Same + `precipitation_probability` | Real-time inference feed. |
| **Open-Meteo Forecast Endpoint** | `https://api.open-meteo.com/v1/forecast` | Hourly | All variables | No key. |
| **Meteostat Python Lib** | https://dev.meteostat.net/ | Hourly station obs | `temp`, `dwpt`, `rhum`, `prcp`, `wspd`, `coco` | **No API key needed.** WMO stations. |
| **Meteostat PyPI** | https://pypi.org/project/meteostat/ | — | — | `pip install meteostat` |
| **Meteostat GitHub** | https://github.com/meteostat/meteostat-python | — | — | Open source |
| **Meteostat Bulk Data** | https://bulk.meteostat.net/v2/ | Hourly/Daily/Monthly | Full station archives | Direct CSV download |

### Reanalysis & Gridded (Free Registration)

| Source | URL | Resolution | Key Variables | Notes |
|:--|:--|:--|:--|:--|
| **ERA5 Single Levels** | https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels | Hourly, 0.25° (~31 km), 1940–present | `total_precipitation`, `2m_temperature`, `2m_dewpoint_temperature`, `10m_wind`, `surface_pressure` | Gold-standard reanalysis. Use `cdsapi`. |
| **ERA5-Land Hourly** | https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-hourly-levels | Hourly, 0.1° (~9 km) | Soil temp, soil water, runoff, precipitation | Higher resolution. Flood/landslide features. |
| **Copernicus CDS Hub** | https://cds.climate.copernicus.eu/ | — | — | Free account required. |
| **IMD Gridded Data** | https://dsp.imdpune.gov.in/ | Daily, 0.25° (rain), 0.5°/1.0° (temp) | Rainfall (1901–present), Tmax/Tmin (1951–present) | Official Indian ground truth. |
| **imdlib (PyPI)** | https://pypi.org/project/imdlib/ | — | — | `pip install imdlib`. Auto-downloads IMD binary. |
| **imdlib (GitHub)** | https://github.com/iamsaswata/imdlib | — | — | Docs: https://imdlib.readthedocs.io/ |
| **imdlib (Conda)** | `conda install -c iamsaswata imdlib` | — | — | — |

### Paid / Freemium Weather APIs

| Source | URL | Free Tier | Notes |
|:--|:--|:--|:--|
| **OpenWeatherMap History** | https://openweathermap.org/api/one-call-3 | 1,000 calls/day | Hourly from 1979 |
| **Visual Crossing** | https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/ | 1,000 records/day | Easy CSV batch export. `visibility`, `severerisk`. |

### Python Weather Integration

| Package | PyPI | GitHub | Purpose |
|:--|:--|:--|:--|
| **openmeteo-requests** | `pip install openmeteo-requests requests-cache retry-requests` | https://github.com/open-meteo/python-requests | Cached client for Open-Meteo |
| **cdsapi** | `pip install cdsapi` | https://github.com/ecmwf/cdsapi | Copernicus ERA5 download client |
| **imdlib** | `pip install imdlib` | https://github.com/iamsaswata/imdlib | IMD gridded data parser |
| **meteostat** | `pip install meteostat` | https://github.com/meteostat/meteostat-python | Global station observations |

---

## 9. Fog & Visibility Data (North India)

| Source | URL | Resolution | Notes |
|:--|:--|:--|:--|
| **IMD Fog DSS Portal** | https://dss.imd.gov.in/ | GeoJSON/WMS, 3–6 hr updates (Dec–Feb) | Dense Fog / Very Dense Fog categories |
| **IMD Fog Warnings (NWFC)** | https://mausam.imd.gov.in/ | Text bulletins | National Weather Forecasting Centre |
| **Delhi RVR Live Feed** | https://mausam.imd.gov.in/delhi/ / https://amssdelhi.gov.in/ | Real-time | Runway Visual Range = station-level visibility |
| **MOSDAC INSAT Fog Product** | https://www.mosdac.gov.in/satellite-catalog | HDF5, GeoTIFF, 15-min, 4 km | Search: `3DIMG_L2C_FOG` / `3RIMG_L2C_FOG` |
| **IMD RAPID Satellite Viewer** | https://rapid.imd.gov.in/ | 15-min, 1–4 km | Night/Day Microphysics fog RGB composites |
| **WiFEX (IITM Fog Experiment)** | https://ews.tropmet.res.in/wifex/index.php | In-situ + 3 km model | Research dataset: droplet size, visibility, LWC |
| **MOSDAC Portal** | https://www.mosdac.gov.in/ | Multiple products | Also: QPE, LST, AOD products |

---

## 10. Satellite Imagery & Remote Sensing

| Source | URL | Instrument | Resolution | Access |
|:--|:--|:--|:--|:--|
| **Copernicus Data Space (CDSE)** | https://dataspace.copernicus.eu/ | Sentinel-1 (SAR), Sentinel-2 (MSI) | 10m, 5–12 day revisit | Free account. Python: `sentinelsat`. |
| **Copernicus Browser** | https://browser.dataspace.copernicus.eu/ | S1/S2 interactive | 10m | Web-based preview & download. |
| **Google Earth Engine** | https://earthengine.google.com/ | Multi-sensor cloud platform | Multiple | Free for research. `pip install earthengine-api`. |
| **GEE: Sentinel-1 SAR** | Asset: `COPERNICUS/S1_GRD` | C-band radar (flood mapping) | 10m | — |
| **GEE: Sentinel-2 SR** | Asset: `COPERNICUS/S2_SR_HARMONIZED` | 13-band optical | 10m | — |
| **GEE: ERA5-Land Hourly** | Asset: `ECMWF/ERA5_LAND/HOURLY` | Weather on GEE | 0.1° | — |
| **GEE: MODIS AOD** | Assets: `MODIS/061/MOD04_L2`, `MYD04_L2` | Aerosol (visibility proxy) | 10 km | — |
| **GEE: CHIRPS Precipitation** | Asset: `UCSB-CHG/CHIRPS/DAILY` | Satellite + station | 0.05° | — |
| **GEE: GPM Precipitation** | Asset: `JAXA/GPM_L3/GSMaP/v6/operational` | Hourly rain | 0.1° | — |
| **ISRO Bhuvan** | https://bhuvan.nrsc.gov.in/ | Cartosat, Resourcesat | 5–30m | Free registration |
| **Bhuvan Disaster Portal** | https://bhuvan-app3.nrsc.gov.in/disaster/ | Flood inundation vectors | Shapefile | Free |
| **USGS Landsat** | https://earthexplorer.usgs.gov/ | Landsat 8/9 | 30m, 16-day | Free (USGS EROS login) |
| **Landsat on AWS** | https://registry.opendata.aws/usgs-landsat/ | Landsat 8/9 COG | 30m | No auth on S3 |
| **Planet Labs Disaster** | https://www.planet.com/disaster-response/ | Daily PlanetScope | 3–5m | Open during declared disasters |

---

## 11. Flood & Disaster Data

| Source | URL | Resolution | Notes |
|:--|:--|:--|:--|
| **CWC Flood Forecasting** | https://ffs.india-water.gov.in/ | Hourly gauge stages, 325+ stations | Warning Level, Danger Level, HFL alerts |
| **CWC 7-Day Model Forecast** | https://aff.india-water.gov.in/ | Daily/Hourly | Mathematical model flood prediction |
| **FloodWatch India App** | Google Play / App Store | Real-time | Official CWC mobile app |
| **NDMA SACHET Alerts** | https://sachet.ndma.gov.in/ | Real-time push | CAP XML/JSON: cyclones, flash floods, heatwaves |
| **NDMIS** | https://ndmis.mha.gov.in/ | — | Disaster Management Information System |
| **NDMA Portal** | https://www.ndma.gov.in/ | — | National Disaster Management Authority |
| **Google FloodHub** | https://floodhub.goog/ | Daily, 7-day ahead | AI-powered river gauge inundation probability |
| **Global Flood Monitoring (UMD/NASA)** | http://flood.umd.edu/ | 3-hourly, 1/8° & 1 km | Flood depth, streamflow. FTP: `flood.umd.edu/data/` |

---

## 12. Air Quality Data (Visibility Proxy)

| Source | URL | Resolution | Key Parameters | Notes |
|:--|:--|:--|:--|:--|
| **CPCB CAAQMS Dashboard** | https://app.cpcbccr.com/ccr/#/caaqm-dashboard-all/caaqm-landing | 15-min / Hourly | PM2.5, PM10, NO₂, SO₂, CO, O₃, Temp, RH, Wind | Fog leading indicator (PM2.5 spikes 4–12h before fog) |
| **CPCB PRANA** | https://prana.cpcb.gov.in/ | Archive | Same | National Clean Air Programme data |
| **OpenAQ Portal** | https://openaq.org/ | Hourly, 500+ Indian stations | PM2.5, PM10 | **Cleanest API** for programmatic access |
| **OpenAQ API v3** | https://api.openaq.org/v3/ | — | — | Free API key required |
| **OpenAQ Explorer** | https://explore.openaq.org/ | — | — | Interactive map |
| **OpenAQ S3 Data Lake** | `s3://openaq-data/` | — | — | Bulk AWS Open Data |
| **SAFAR India** | http://safar.tropmet.res.in/ | Real-time + 72h forecast | PM2.5, PM10, Black Carbon, BL Height | Delhi-NCR, Mumbai, Pune, Ahmedabad |
| **IMD AWS Network** | https://aws.imd.gov.in/ | 15-min to 1-hour | Temp, RH, Wind, Rain | 1,000+ stations. Regional: `mausam.imd.gov.in/{city}/` |

---

## 13. Government Portals & Official Reports

| Portal | URL | Type |
|:--|:--|:--|
| **Indian Railways Official** | https://indianrailways.gov.in/ | Ministry of Railways |
| **CRIS** | https://cris.org.in/ | IT wing: PRS, FOIS, ICMS, COA |
| **NTES Portal** | https://enquiry.indianrail.gov.in/mntes/ | Public train enquiry |
| **data.gov.in** | https://data.gov.in/ | Open Government Data |
| **Rail Drishti** | https://raildrishti.in/ | Dashboard |
| **IRCEP** | https://ircep.gov.in/ | Civil Engineering Portal |
| **CORE (Electrification)** | https://core.indianrailways.gov.in/ | Electrification status |
| **Gati Shakti** | https://gatishakti.gov.in/ | Multi-modal infra GIS |

---

## 14. Railway Simulation Frameworks

| Tool | URL | Language | Notes |
|:--|:--|:--|:--|
| **rail-delay-simulator** (AAAI-26) | https://github.com/orailix/rail-delay-simulator | Python/PyTorch | GPU-parallelized stochastic simulator. DCIL imitation learning. |
| **Eclipse SUMO (Rail)** | https://github.com/eclipse-sumo/sumo | C++/Python | Rail extensions: block reservation, signaling, TraCI API. [Docs](https://sumo.dlr.de/docs/Simulation/Railways.html) |
| **OSRD (SNCF/OpenRail)** | https://github.com/OpenRailAssociation/osrd | Rust/Java | Full-stack: infrastructure, timetable, capacity analysis. [Web](https://osrd.fr/) |
| **Flatland-RL** (SBB/DB) | https://github.com/flatland-association/flatland-rl | Python | Multi-agent RL for dispatching. PyPI: `flatland-rl`. [Web](https://www.flatland-association.org/) |
| **NeTrainSim** (Virginia Tech) | https://github.com/VTTI-CSM/NeTrainSim | C++/Python | Network multi-train simulator. Speed restrictions, grades. |
| **OSM2Rail** | https://github.com/jiawei92/OSM2Rail | Python | OSM → routable railway graph topology. |

---

## 15. ML Model Implementations (Delay Prediction)

### Graph Neural Networks

| Model | URL | Framework | Notes |
|:--|:--|:--|:--|
| **STGCN (IJCAI-18)** | https://github.com/VeritasYin/STGCN_IJCAI-18 | TensorFlow | Original paper implementation |
| **STGCN PyTorch** (KimMeen) | https://github.com/KimMeen/STGCN | PyTorch | Clean reimplementation |
| **STGCN PyTorch** (Aguin) | https://github.com/Aguin/STGCN-PyTorch | PyTorch | Alternative PyTorch impl |
| **DCRNN PyTorch** (LeiBAI) | https://github.com/LeiBAI/DCRNN_Pytorch | PyTorch | Diffusion conv + Seq2Seq GRU |
| **DCRNN PyTorch** (chnsh) | https://github.com/chnsh/DCRNN_PyTorch | PyTorch | Alternative impl |
| **Graph WaveNet** | https://github.com/nnzhan/Graph-WaveNet | PyTorch | Adaptive adjacency + dilated causal conv |
| **RSTGCN Paper** (IIT KGP) | https://arxiv.org/abs/2510.01262 | — | Indian Railways 4,735 stations. Code TBD. |

### Transformers & Time-Series

| Model | URL | Framework | Notes |
|:--|:--|:--|:--|
| **Time-Series-Library (TSlib)** | https://github.com/thuml/Time-Series-Library | PyTorch | Unified benchmark: PatchTST, Informer, Autoformer, iTransformer |
| **Temporal Fusion Transformer** | https://github.com/sktime/pytorch-forecasting | PyTorch | TFT + N-BEATS + DeepAR. PyPI: `pytorch-forecasting` |
| **Informer** | https://github.com/zhouhaoyi/Informer2020 | PyTorch | ProbSparse attention O(L log L) |
| **PatchTST** | https://github.com/yuqinie98/PatchTST | PyTorch | Channel-independent patched Transformer |
| **Autoformer** | https://github.com/thuml/Autoformer | PyTorch | Auto-correlation + decomposition |

### Gradient-Boosted Trees

| Model | URL | PyPI | Notes |
|:--|:--|:--|:--|
| **LightGBM** | https://github.com/microsoft/LightGBM | `lightgbm` | Histogram-based; fastest GBDT; <1ms inference |
| **XGBoost** | https://github.com/dmlc/xgboost | `xgboost` | Industry standard |
| **CatBoost** | https://github.com/catboost/catboost | `catboost` | Best for high-cardinality categoricals (station IDs) |

---

## 16. Spatio-Temporal & Graph ML Libraries

| Library | URL | PyPI | Best For |
|:--|:--|:--|:--|
| **PyG Temporal** | https://github.com/pyg-team/pytorch_geometric_temporal | `torch-geometric-temporal` | STGCN, DCRNN, A3T-GCN, GConvGRU on dynamic graphs |
| **Torch Spatiotemporal (tsl)** | https://github.com/TorchSpatiotemporal/tsl | `torch-spatiotemporal` | Neural ST modeling, graph imputation |
| **LibCity** | https://github.com/LibCity/Bigscity-LibCity | `bigscity-libcity` | 70+ urban transit models benchmark |
| **DGL** | https://github.com/dmlc/dgl | `dgl` | Distributed large-graph GNN training |
| **StellarGraph** | https://github.com/stellargraph/stellargraph | `stellargraph` | GCN/GAT + Temporal Random Walks |

---

## 17. Time-Series Forecasting Libraries

| Library | URL | PyPI | Best For |
|:--|:--|:--|:--|
| **Darts** | https://github.com/unit8co/darts | `darts` | Unified API: ARIMA, TCN, TFT, N-BEATS, TiDE + backtesting |
| **GluonTS** | https://github.com/awslabs/gluonts | `gluonts` | Probabilistic forecasting: DeepAR, GP-Forecaster |
| **tsai** | https://github.com/timeseriesAI/tsai | `tsai` | InceptionTime, PatchTST, TST on Fastai/PyTorch |
| **NeuralProphet** | https://github.com/ourownstory/neural_prophet | `neuralprophet` | Trend + seasonality + exogenous regressors |
| **pytorch-forecasting** | https://github.com/sktime/pytorch-forecasting | `pytorch-forecasting` | TFT, N-BEATS, DeepAR with quantile outputs |

---

## 18. Conformal Prediction & Uncertainty Libraries

| Library | URL | PyPI | Notes |
|:--|:--|:--|:--|
| **MAPIE** | https://github.com/scikit-learn-contrib/MAPIE | `mapie` | Model-agnostic prediction intervals. Wraps sklearn/GBDT. |
| **crepes** | https://github.com/henrikbostrom/crepes | `crepes` | Mondrian CP, normalized non-conformity, out-of-fold calibration |
| **puncc** | https://github.com/deel-ai/puncc | `puncc` | Split/cross/adaptive conformal under covariate shift |
| **nonconformist** | https://github.com/donlnz/nonconformist | `nonconformist` | Classic inductive + transductive CP |
| **Fortuna** | https://github.com/aws/fortuna | `aws-fortuna` | AWS uncertainty quantification for production |
| **TorchCP** | https://github.com/ZJW-ZZ/TorchCP | `torchcp` | PyTorch-native conformal prediction |
| **Awesome Conformal Prediction** | https://github.com/valeman/awesome-conformal-prediction | — | Curated papers, tutorials, implementations |

---

## 19. Feature Engineering Tools

| Tool | URL | PyPI | Notes |
|:--|:--|:--|:--|
| **tsfresh** | https://github.com/blue-yonder/tsfresh | `tsfresh` | 750+ auto-extracted statistical features + hypothesis testing |
| **Featuretools** | https://github.com/alteryx/featuretools | `featuretools` | Deep Feature Synthesis across relational tables |
| **tsfel** | https://github.com/fraunhoferportugal/tsfel | `tsfel` | Fast temporal/spectral feature extraction from telemetry |
| **catch22** | https://github.com/chlubba/catch22 | `pycatch22` | 22 ultra-efficient C-based time-series features |

---

## 20. GTFS Processing Libraries

| Tool | URL | PyPI | Notes |
|:--|:--|:--|:--|
| **gtfs-kit** | https://github.com/mrcagney/gtfs_kit | `gtfs-kit` | Analyze, validate, compute GTFS spatial/temporal metrics |
| **partridge** | https://github.com/remix/partridge | `partridge` | High-perf lazy-loading GTFS reader |
| **peartree** | https://github.com/kuanb/peartree | `peartree` | GTFS → NetworkX graph with travel time edges |
| **pygtfs** | https://github.com/geometalab/pygtfs | `pygtfs` | GTFS → SQLite/PostgreSQL via SQLAlchemy |
| **gtfstk** | https://github.com/araichev/gtfstk | `gtfstk` | Geometric transit analysis |
| **transitland-python** | https://github.com/transitland/transitland-python | `transitland` | Fetch global open transit feeds |
| **mobility-database-catalogs** | https://github.com/MobilityData/mobility-database-catalogs | — | Global GTFS/GTFS-RT feed catalog |

---

## 21. Streaming & Real-Time Frameworks

| Tool | URL | PyPI | Notes |
|:--|:--|:--|:--|
| **confluent-kafka-python** | https://github.com/confluentinc/confluent-kafka-python | `confluent-kafka` | High-perf C-based Kafka client. >100K events/sec. |
| **kafka-python** | https://github.com/dpkp/kafka-python | `kafka-python` | Pure Python Kafka client |
| **Faust Streaming** | https://github.com/faust-streaming/faust | `faust-streaming` | Python stream processing (Kafka Streams analogue) |
| **Bytewax** | https://github.com/bytewax/bytewax | `bytewax` | Rust-backed Python stream processing |
| **FastAPI** | https://github.com/fastapi/fastapi | `fastapi` | WebSocket ETA broadcast server |
| **websockets** | https://github.com/python-websockets/websockets | `websockets` | Low-level async WebSocket library |

---

## 22. GIS & Climate Python Libraries

### GIS Processing Stack

```bash
pip install osmnx pyrosm osmium geopandas shapely rasterio rioxarray richdem elevation pyproj folium
```

| Library | PyPI | Purpose |
|:--|:--|:--|
| **osmnx** | `osmnx` | Download & model railway networks as NetworkX graphs |
| **pyrosm** | `pyrosm` | Fast C++ parsing of `.osm.pbf` → GeoPandas |
| **osmium (pyosmium)** | `osmium` | Stream processing of large PBF files |
| **geopandas** | `geopandas` | Spatial joins, buffering, R-Tree indexing |
| **shapely** | `shapely` | Geometric calculations: curvature, intersections |
| **rasterio** | `rasterio` | GeoTIFF raster I/O (DEM elevation sampling) |
| **rioxarray** | `rioxarray` | Geospatial xarray extension (reprojection, clipping) |
| **richdem** | `richdem` | Terrain slope, aspect, hillshade |
| **elevation** | `elevation` | Automated DEM tile download |
| **folium** | `folium` | Leaflet maps in Python |

### Climate & Weather Processing Stack

```bash
pip install xarray netCDF4 cfgrib cdsapi earthengine-api rasterio rioxarray metpy imdlib meteostat openmeteo-requests
```

| Library | PyPI | Purpose |
|:--|:--|:--|
| **xarray** | `xarray` | N-dimensional labeled climate datasets (NetCDF/GRIB) |
| **netCDF4** | `netCDF4` | Low-level NetCDF reading/writing |
| **cfgrib** | `cfgrib` | ECMWF GRIB1/GRIB2 decoder for xarray |
| **cdsapi** | `cdsapi` | Copernicus CDS API client (ERA5 downloads) |
| **earthengine-api** | `earthengine-api` | Google Earth Engine Python SDK |
| **metpy** | `metpy` | Meteorological calculations (dewpoint, RH, wind chill) |
| **imdlib** | `imdlib` | IMD gridded rainfall/temp binary parser |
| **meteostat** | `meteostat` | Global WMO station observations → Pandas |
| **openmeteo-requests** | `openmeteo-requests` | Cached Open-Meteo API client |

---

## 23. Indian Railways ML Research Repos

| Repository | URL | Focus |
|:--|:--|:--|
| **DA323 IR Delay Datasets** (IIT) | https://github.com/ankitaanand28/DA323_IndianRailwayTrainDelayDatasets | Multi-year delay data for NE/metro corridors |
| **Train-delay-analysis** | https://github.com/ramesht007/Train-delay-analysis | Prophet + ARIMA + weather features |
| **Train-time-delay-prediction** | https://github.com/DeekshithRajBasa/Train-time-delay-prediction-using-machine-learning | GNN + ST delay modeling |
| **Train-delay-estimation** (IEEE) | https://github.com/R-Gaurav/train-delay-estimation | N-Order Markov + Random Forest |
| **Rail.Sanchalak** | https://github.com/iamqt-90/Rail.Sanchalak | RL + GA conflict resolution, delay optimization |
| **CFD-Train_Delay_Prediction** | https://github.com/ankush2204/CFD-Train_Delay_Prediction | Climate features → delay prediction |
| **Train-Signals-App** | https://github.com/anarghya-das/Train-Signals-App | FOG PASS device + severe weather impact |
| **IR Tweets Sentiment** | https://github.com/shauryr/sentiment-analysis-on-indian-railways-tweets | NLP on @RailMinIndia delay complaints |
| **RailKit SDK** | https://github.com/RAJIV81205/RailKit | NTES/IRCTC client library |

---

## 24. Academic Paper Code Repositories

| Paper/Project | URL | Focus |
|:--|:--|:--|
| **GNN Train Delay Disaggregation** | https://github.com/maximilianvie/GNN-Based-Train-Delay-Disaggregation | Macro → micro delay decomposition |
| **Adaptsys Train Delays** (Complex Networks) | https://github.com/CoMuNeLab/adaptsys_train-delays | Topological cascading delay propagation |
| **Uncertainty-Aware Delay** | https://github.com/jsroa15/Train-delay-prediction | Bayesian NN + MC Dropout |
| **Graph-Enhanced Delay** | https://github.com/npinto97/graph-enhanced-train-delay-prediction | Knowledge graphs + DL regressors |
| **rail-delay-simulator** (AAAI-26) | https://github.com/orailix/rail-delay-simulator | DCIL imitation learning simulator |
| **RSTGCN Paper** (IIT KGP) | https://arxiv.org/abs/2510.01262 | Indian Railways ST-GCN |

---

## 25. CAG Audit Reports (Punctuality)

| Report | URL | Coverage |
|:--|:--|:--|
| **CAG Report No. 22 of 2021 (Railways)** | https://cag.gov.in/en/audit-report/details/113264 | Para 2.1: Punctuality & Travel Time. 10-year data, all 17 zones. ICMS leniency critique. |
| **CAG Report No. 22 (Direct PDF)** | https://cag.gov.in/uploads/download_audit_report/2021/Report_No_22_of_2021_Railways.pdf | Full ~7.6 MB PDF |
| **CAG Report No. 32 of 2016 (ICMS IT Audit)** | https://cag.gov.in/en/audit-reports (Search: "Report No. 32 of 2016 Railways ICMS") | ICMS punctuality module audit, data integrity issues |
| **CAG Audit Reports Portal** | https://cag.gov.in/en/audit-reports | All Railway audit reports (safety, punctuality, infrastructure) |

### Academic Data Repositories

| Source | URL | Notes |
|:--|:--|:--|
| **Zenodo** (Search: "Indian Railways") | https://zenodo.org/ | Open-access delay research datasets |
| **Figshare** (Search: "Railway Delay") | https://figshare.com/ | Spatio-temporal train operation records |
| **Harvard Dataverse** | https://dataverse.harvard.edu/ | GNN benchmark datasets for rail timetable rescheduling |
| **IEEE DataPort** | https://ieee-dataport.org/ | Transit conflict detection datasets |

---

> **Total: 200+ verified links across 25 categories.**
> Cross-reference with [Phase0_Research_Plan.md](./Phase0_Research_Plan.md) §3 (Data Discovery & Acquisition Strategy).
