export const load = async ({ fetch }) => {
	// user defined routes
	const userRes = await fetch("/api/routes");
	const { features: userRoutes } = await userRes.json();

	// FDOT scenic highways
	const fdotUrl = new URL("https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Scenic_Highways_TDA/FeatureServer/0/query");
	fdotUrl.searchParams.set("where", "1=1");
	fdotUrl.searchParams.set("outFields",
		[
			"SCENEHWY",
			"DESCRIPT",
			"DESIG_DATE",
			"DISTRICT",
			"COUNTY",
			"BEGIN_POST",
			"END_POST",
			"Shape__Length"
		].join(',')
	);
	fdotUrl.searchParams.set("outSR", "4326");
	fdotUrl.searchParams.set("f", "pgeojson");
	const stateRes = await fetch(fdotUrl.toString());
	const { features: stateRoutes } = await stateRes.json();

	return { userRoutes, stateRoutes };
};