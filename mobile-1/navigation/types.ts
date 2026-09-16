export type RootStackParamList = {
  Splash: undefined;
  LocationPermission: undefined;
  Home: undefined;
  StationSearch: { stationCode?: string } | undefined;
  // Pushed once a train is selected; hosts the Stitch 4-tab group (Train View/Track/Behavior/
  // Alerts) below. Frame 35/36/38's old single-screen destinations (TrainDetail, RouteTimeline,
  // LiveTrack) are now tabs inside here rather than separate stack routes — see UI_NOTES.md.
  TrainTabs: { trainNo: string };
  PNR: undefined;
};

export type TrainTabsParamList = {
  TrainView: { trainNo: string };
  Track: { trainNo: string };
  Behavior: { trainNo: string };
  Alerts: { trainNo: string };
};
