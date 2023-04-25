import './style.css'
import { Math as CesiumMath, Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, JulianDate, BoundingSphere, HeadingPitchRange, Cartesian3, PropertyBag, MapboxStyleImageryProvider } from 'cesium'
import * as Highcharts from 'highcharts';
import HC_more from "highcharts/highcharts-more";
HC_more(Highcharts);
import { Incident, STR_FEMALE, STR_MALE, STR_ADULT, STR_CHILD, STR_TEEN, findStateByCode, US_STATES_DICT, HOME_CAMERA, IncidentParticipantAgeGroup, IncidentParticipantGender, STR_UNKNOWN, findStateByAbbr } from "./utils";

const globalAlpha = .25;
const highlightColor = Color.RED.withAlpha(globalAlpha);

const delimPipe = "||";
const delimColon = "::";

let mapView = "USA";
let mapActiveState = "";
let mapActiveCounty = "";

const mapIncidentEntities: any[] = [];

let chartStack: any;
let chartTime: any;

let highlightedEntities: any[] = [];
let cdEntities: any[] = [];
let cnyEntities: any[] = [];
let stEntities: any[] = [];

let statesMap = new Map();
let countiesMap = new Map();
let cdMap = new Map();
let citiesMap = new Map();
let coordsMap = new Map();

const MAPBOX_API_KEY: any = import.meta.env.VITE_MAPBOX_API_KEY;

const viewer = new Viewer("cesium", {
	fullscreenButton: false,
	homeButton: false,
	timeline: false,
	animation: false,
	shouldAnimate: false,
	baseLayerPicker: false,
	navigationHelpButton: false,
	geocoder: false,
	infoBox: false,
	selectionIndicator: false,
	sceneModePicker: false,
	imageryProvider: new MapboxStyleImageryProvider({
		styleId: "dark-v11",
		accessToken: MAPBOX_API_KEY
	})
});
const scene = viewer.scene;
const camera = viewer.camera;
const handler = viewer.screenSpaceEventHandler;

// let genderMap = new Map([[STR_FEMALE, 0],[STR_MALE, 0]]);
// let ageGroupsMap = new Map([[STR_ADULT, 0],[STR_TEEN, 0],[STR_CHILD, 0]]);
// let agesMap = new Map();
// let attributesMap = new Map();

let htmlTooltip = document.getElementById("tooltip")!;
const usaNav: any = document.getElementById("usa");
const stateNav: any = document.getElementById("state");
const countyNav: any = document.getElementById("county");

const dataMap = new Map();
let allData: any[] = [];

Promise.all([fetch('gva_data.json').then(r => r.json())]).then(data => {

	usaNav?.addEventListener('click', () => {
		if (mapView !== "USA") {
			mapView = "USA";
			mapActiveState = "";
			mapActiveCounty = "";
			stEntities.forEach((entity: any) => entity.show = true)
			cnyEntities.forEach((entity: any) => entity.show = false)
			clearIncidentEntities();
			camera.flyTo(HOME_CAMERA);
			stateNav.classList.add("hidden");
			stateNav.innerHTML = "";
			countyNav.classList.add("hidden");
			countyNav.innerHTML = "";
			loadBarChartData(allData, `USA Incidents by Age Group and Gender`);
			loadTimeChartData(allData, `USA Incidents Over Time (2014-2016)`);
		}
	})
	
	stateNav?.addEventListener('click', () => {
		if (mapView !== "ST") {
			mapView = "ST";
			mapActiveCounty = "";
			stEntities.forEach((entity: any) => {
				const props = entity.properties;
				if (props.STATE.getValue() === mapActiveState) {
					entity.show = false;
					flyToPolygon(entity.polygon);
				} else {
					entity.show = true;
				}
			})
			cnyEntities.forEach((entity: any) => {
				const props = entity.properties;
				if (props.STATE.getValue() === mapActiveState) {
					entity.show = true;
				} else {
					entity.show = false;
				}
			})
			countyNav.innerHTML = "";
			countyNav.classList.add("hidden");
			
			const incidentData = allData.filter((incident: Incident) => incident.st === findStateByCode(mapActiveState)?.abbr);

			clearIncidentEntities();
			loadBarChartData(incidentData, `${stateNav.innerHTML} Incidents by Age Group and Gender`);
			loadTimeChartData(incidentData, `${stateNav.innerHTML} Incidents Over Time (2014-2016)`);
		}
	})

	setupDataMaps(data[0]);
	setupInitCamera();
	setupDataSources();

	// init bar chart, load usa data
	setupBarChart();
	loadBarChartData(data[0], 'USA Incidents by Age Group and Gender');

	// init time chart, load usa data
	setupTimeChart();
	loadTimeChartData(data[0], 'USA Incidents Over Time (2014-2016)')
	
	// init bubble chart
	setupBubbleChart(data[0]);

})

const setupDataMaps = (data: any) => {
	allData = data;
	data.forEach((d: Incident) => {
		setupAllData(d)
	})
}

const setupAllData = (incident: Incident) => {

	let key = incident.st;

	if (key) {
		if (dataMap.has(key)) {
			const dataObj = dataMap.get(key);
			dataObj.state.incidents.total = dataObj.state.incidents.total + 1;
			dataObj.state.incidents.killed = dataObj.state.incidents.killed + Number(incident.nkill);
			dataObj.state.incidents.injured = dataObj.state.incidents.injured + Number(incident.ninj);
			dataObj.state.incidents.list.push(incident.id);
			dataMap.set(key, dataObj);
		} else {
			// setup initial object
			const dataObj = {
				state: {
					abbr: US_STATES_DICT[key].abbr,
					name: US_STATES_DICT[key].name,
					incidents: {
						total: 1,
						killed: Number(incident.nkill),
						injured: Number(incident.ninj),
						list: [incident.id],
						gender: { [STR_FEMALE]: 0, [STR_MALE]: 0 },
						ageGroup: { [STR_CHILD]: 0, [STR_TEEN]: 0, [STR_ADULT]: 0 }
					},
					entities: []
				},
				counties: new Map(),
				districts: new Map(),
				cities: new Map(),
			}
			dataMap.set(key, dataObj);
		}
	
		if (incident.genders) {
			incident.genders.split(delimPipe).forEach((g: any) => {
				if (g.includes(STR_FEMALE)) {
					dataMap.get(key).state.incidents.gender[STR_FEMALE] = dataMap.get(key).state.incidents.gender[STR_FEMALE] + 1;
				} else {
					dataMap.get(key).state.incidents.gender[STR_MALE] = dataMap.get(key).state.incidents.gender[STR_MALE] + 1;
				}
			})
		}

		if (incident.agroups) {
			incident.agroups.split(delimPipe).forEach((a: any) => {
				if (a.includes(STR_ADULT)) {
					dataMap.get(key).state.incidents.ageGroup[STR_ADULT] = dataMap.get(key).state.incidents.ageGroup[STR_ADULT] + 1;
				} else if (a.includes(STR_TEEN)) {
					dataMap.get(key).state.incidents.ageGroup[STR_TEEN] = dataMap.get(key).state.incidents.ageGroup[STR_TEEN] + 1;
				} else if (a.includes(STR_CHILD)) {
					dataMap.get(key).state.incidents.ageGroup[STR_CHILD] = dataMap.get(key).state.incidents.ageGroup[STR_CHILD] + 1;
				}
			})
		}

		addToGeoMap(key, statesMap);

		if (incident.cny) {
			const cny = incident.cny;
			dataMap.get(key).counties.set(cny, 1);
			addToGeoMap(`${cny}_${key}`, countiesMap);
		}

		if (incident.cd) {
			const cd = incident.cd?.length < 2 ? `0${incident.cd}` : incident.cd;
			dataMap.get(key).districts.set(cd, 1);
			addToGeoMap(`${cd}_${key}`, cdMap);
		}

		const location = {
			location: `${incident.lng},${incident.lat}`
		}

		if (incident.cty) {
			const cityKey = `${incident.cty}_${incident.cny ? incident.cny : "NOCOUNTY"}`;
			const fullKey = `${cityKey}_${incident.st ? incident.st : "NOSTATE"}`;
			dataMap.get(key).cities.set(cityKey, 1);
			addToGeoMap(fullKey, citiesMap, location);
			addToGeoMap(`${fullKey}_${location.location}`, coordsMap, location);
		}

	}

}

// const generateColorScale = (num: number, color1: any, color2: any) => {
// 	const colors = [];
// 	for (let i = 0; i < num; i++) {
// 		const percent = i / (num - 1);
// 		const r = Math.round(color1.r * (1 - percent) + color2.r * percent);
// 		const g = Math.round(color1.g * (1 - percent) + color2.g * percent);
// 		const b = Math.round(color1.b * (1 - percent) + color2.b * percent);
// 		const hex = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
// 		colors.push(hex);
// 	}
// 	return colors;
// }

// const formatCounty = (cny: string) => {
// 	return cny.replace(" County", "")
// 		.replace(" Parish", "")
// 		.replace(" Borough", "")
// 		.replace(" CA", "")
// 		.replace(" Census Area", "")
// 		.replace(" City", "");
// }

const addToGeoMap = (key: string, map: Map<any, any>, optionals: any = undefined) => {
	if (map.has(key)) {
		const obj = map.get(key);
		obj.incidents._count = obj.incidents._count + 1;
		map.set(key, obj);
	} else {
		const obj = {
			incidents: {
				_count: 1,
				_killed: 0,
				_injured: 0,
				list: [],
				gender: { },
				ageGroup: { }
			},
			// color: Color.fromRandom({alpha: globalAlpha}),
			...optionals
		}
		obj.incidents.gender[STR_FEMALE] = 0;
		obj.incidents.gender[STR_MALE] = 0;
		obj.incidents.ageGroup[STR_CHILD] = 0;
		obj.incidents.ageGroup[STR_TEEN] = 0;
		obj.incidents.ageGroup[STR_ADULT] = 0;
		map.set(key, obj);
	}
}

const setupInitCamera = () => {
	camera.flyTo(HOME_CAMERA);
}
	
const getCurrentCamera = () => {
	return {
		orientation: {
			heading: camera.heading,
			pitch: camera.pitch,
			roll: camera.roll
		}, 
		destination: {
			...camera.position
		}
	}
}

const updateMaterial = (entity: Entity, color: Color) => {
	const colorProperty = new CallbackProperty((_t, r) => {
		if (highlightedEntities.length) {
			if (highlightedEntities.find((e: Entity) => e.id === entity.id)) {
				return Color.clone(highlightColor, r);
			}
		}
		return Color.clone(color, r);
	}, false);
	
	return new ColorMaterialProperty(colorProperty);
}





camera.moveEnd.addEventListener(() => {
	console.log("CAMERA:", getCurrentCamera());
})














handler.setInputAction((movement: { endPosition: Cartesian2; }) => {
	// const tooltip: any = viewer.entities.getById('tooltip');
	// const cartesian = scene.pickPosition(movement.endPosition);
	// const pick = scene.pick(movement.endPosition);
	const pickedObject: any = scene.pick(movement.endPosition)?.id;

	const xPosition = movement.endPosition.x;
	const yPosition = movement.endPosition.y;

	const hideTooltip = () => {
		htmlTooltip.classList.add('hidden');
		htmlTooltip.classList.remove('block');
		highlightedEntities = [];
	}

	if (defined(pickedObject)) {
		let tooltipText = "";
		const props = pickedObject.properties?.getValue(JulianDate.now());
		if (props) {

			if (props.COUNTY) {
				highlightedEntities = cnyEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
			} else if (props.CD) {
				highlightedEntities = cdEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
			} else if (props.STATE) {
				highlightedEntities = stEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
			}

			const state = findStateByCode(props.STATE);

			if (props.COUNTY) {
				const key = `${props.NAME}_${state?.abbr}`;
				const incidents = countiesMap.get(key)?.counties.incidents._count;
				const title = `${props.NAME} ${props.LSAD}, ${state?.abbr}`
				if (!incidents) {
					tooltipText = `${title}`;
				} else {
					tooltipText= `${title}`;
				}
			} else if (props.CD) {
				const key = `${props.CD}_${state?.abbr}`;
				const incidents = cdMap.get(key)?.districts.incidents._count;
				const title = `District ${props.CD}, ${state?.abbr}`
				if (!incidents) {
					tooltipText = `${title}`;
				} else {
					tooltipText = `${title}`;
				}
			} else if (state) {
				tooltipText = `${props.NAME}`;
			} else {
				tooltipText = `
					${props.CITY} - ${props.DATE}
					${props.INJURED ? `<br/> ${props.INJURED} injured` : ``}
					${props.KILLED ? `<br/> ${props.KILLED} killed` : ``}

				`
			}

		}
		
		htmlTooltip.innerHTML = tooltipText;
		htmlTooltip.style.transform = `translate(${xPosition + 25}px, ${yPosition + 25}px)`;
		htmlTooltip.classList.add('block');
		htmlTooltip.classList.remove('hidden');
		document.getElementById("cesium")?.classList.add("cursor-pointer");
	} else {
		hideTooltip();
		document.getElementById("cesium")?.classList.remove("cursor-pointer");
	}

}, ScreenSpaceEventType.MOUSE_MOVE);





























handler.setInputAction((movement: { position: Cartesian2; }) => {

	const pickedEntity: any = scene.pick(movement.position);

	if (defined(pickedEntity)) {

		const props = pickedEntity.id.properties;
		const entityName = props.NAME?.getValue();
		const entityState = props.STATE?.getValue();
		const entityLSAD = props.LSAD?.getValue();
		const entityType = props.TYPE.getValue();
		// const entityCD = props.CD?.getValue();
		mapView = props.TYPE.getValue();
		
		console.log(entityType, "picked")

		if (entityType === "ST") {

			countyNav.classList.add("hidden");
			countyNav.innerHTML = "";
			stateNav.classList.remove("hidden");
			stateNav.innerHTML = entityName;
			mapActiveState = entityState;

			const incidentData = allData.filter((incident: Incident) => incident.st === findStateByCode(props.STATE.getValue())?.abbr);

			stEntities.forEach((entity: any) => {
				if (entity.name === pickedEntity.id.name) {
					// hide the picked state
					entity.show = false;
					// go through all counties
					// show only the counties that
					// are in the picked state
					cnyEntities.forEach((entity: any) => {
						const props = entity.properties;
						// show "sibling" counties,
						// hide all others
						if (entityState === props.STATE.getValue()) {
							entity.show = true;
						} else {
							entity.show = false;
						}
					})
				} else {
					entity.show = true;
				}
			})

			clearIncidentEntities();
			loadBarChartData(incidentData, `${entityName} Incidents by Age Group and Gender`);
			loadTimeChartData(incidentData, `${entityName} Incidents Over Time (2014-2016)`);

		} else if (entityType === "CNY") {

			const countyFull = `${entityName}${entityLSAD ? ` ${entityLSAD}` : ``}`;
			countyNav.classList.remove("hidden");
			countyNav.innerHTML = countyFull;
			mapActiveCounty = countyFull;
			console.log(mapActiveCounty, "was picked");

			cnyEntities.forEach((entity: any) => {
				const props = entity.properties;
				// show "sibling" counties,
				// hide all others
				if (entityState === props.STATE.getValue()) {
					entity.show = true;
				} else {
					entity.show = false;
				}
			});

			// hide our picked county
			pickedEntity.id.show = false;

			const incidentData = allData.filter((incident: Incident) => {
				if (incident.st === findStateByCode(props.STATE.getValue())?.abbr) {
					if (incident.cny === countyFull) {
						return incident;
					} else if (!incident.cny && incident.cty === entityName) {
						return incident;
					}
				}
				
				return;
			});

			clearIncidentEntities();
			addIncidentEntities(incidentData);
			console.log(incidentData);
			loadBarChartData(incidentData, `${countyFull} Incidents by Age Group and Gender`);
			loadTimeChartData(incidentData, `${countyFull} Incidents Over Time (2014-2016)`);

		}

		flyToPolygon(pickedEntity.id.polygon);

	}

}, ScreenSpaceEventType.LEFT_CLICK);



































const setupDataSources = () => {

	GeoJsonDataSource.load("us_st.json").then((source) => {
		viewer.dataSources.add(source);
		stEntities = source.entities.values;
		for (var i = 0; i < stEntities.length; i++) {
			stEntities[i].polygon.material = updateMaterial(stEntities[i], Color.WHITE.withAlpha(globalAlpha));
			stEntities[i].polygon.outline = true;
			stEntities[i].polygon.outlineColor = Color.BLACK;
		}
	})

	// GeoJsonDataSource.load("us_cd.json").then((source) => {
	// 	viewer.dataSources.add(source);
	// 	cdEntities = source.entities.values;
	// 	for (var i = 0; i < cdEntities.length; i++) {
	// 		cdEntities[i].show = false;
	// 		cdEntities[i].polygon.material = updateMaterial(cdEntities[i], Color.WHITE.withAlpha(globalAlpha));
	// 		cdEntities[i].polygon.outline = true;
	// 		cdEntities[i].polygon.outlineColor = Color.BLACK;
	// 		cdEntities[i].polygon.outlineWidth = 3;
	// 	}
	// })

	GeoJsonDataSource.load("us_cny.json").then((source) => {
		viewer.dataSources.add(source);
		cnyEntities = source.entities.values;
		for (var i = 0; i < cnyEntities.length; i++) {
			cnyEntities[i].show = false;
			cnyEntities[i].polygon.material = updateMaterial(cnyEntities[i], Color.YELLOW.withAlpha(globalAlpha));
			cnyEntities[i].polygon.outline = true;
			cnyEntities[i].polygon.outlineColor = Color.BLACK;
		}
	})
}











const clearIncidentEntities = () => {
	mapIncidentEntities.forEach((id: string) => {
		viewer.entities.removeById(id);
	})
	mapIncidentEntities.length = 0;
}

const addIncidentEntities = (data: Incident[]) => {
	data.forEach((incident: Incident) => {
		const props = new PropertyBag();
		props.addProperty("CITY", incident.cty ? incident.cty : "NOCITY");
		props.addProperty("DATE", incident.date);
		incident.nkill ? props.addProperty("KILLED", incident.nkill) : ``;
		incident.ninj ? props.addProperty("INJURED", incident.ninj) : ``;
		let color = Color.WHITE;
		if (Number(incident.nkill) > 0) {
			color = Color.RED;
		} else if (Number(incident.ninj) > 0) {
			color = Color.YELLOW;
		} else {
			color = Color.AQUAMARINE;
		}
		const entity: any = viewer.entities.add({
			show: true,
			position: Cartesian3.fromDegrees(Number(incident.lng), Number(incident.lat), 0),
			point: {
				pixelSize: 2,
				color: color
			},
			properties: props
		});
		mapIncidentEntities.push(entity.id);
	});
}

const flyToPolygon = (polygon: any) => {
	const boundingSphere = BoundingSphere.fromPoints(polygon.hierarchy.getValue().positions);
	camera.flyToBoundingSphere(boundingSphere, {
		duration: 1,
		offset: new HeadingPitchRange(0, CesiumMath.toRadians(-75), boundingSphere.radius * 2),
	});
}







const setupBarChart = () => {
	// @ts-ignore
	chartStack = Highcharts.chart('chartStack', {
		chart: {
			type: 'column',
			style: {
				fontFamily: 'Encode Sans Condensed'
			}
		},
		title: {
			text: '',
			align: 'left'
		},
		xAxis: {
			categories: [
				IncidentParticipantAgeGroup.Adult,
				IncidentParticipantAgeGroup.Teen,
				IncidentParticipantAgeGroup.Child,
				IncidentParticipantAgeGroup.Unknown
			]
		},
		yAxis: {
			min: 0,
			title: {
				text: ''
			}
		},
		legend: {
			reversed: true
		},
		plotOptions: {
			series: {
				stacking: 'normal',
				dataLabels: {
					enabled: true
				}
			}
		},
		series: [
			{ name: IncidentParticipantGender.Unknown, color: '#bbb' },
			{ name: IncidentParticipantGender.Female, color: '#F88FB3' },
			{ name: IncidentParticipantGender.Male, color: '#AFDAF5' }
		]
		// options - see https://api.highcharts.com/highcharts
	});
}

const loadBarChartData = (data: Incident[], title: string) => {

	const chartData = data.map((d: Incident) => {
		const obj: any = {
			max: 1,
			agroups: !d.agroups ? [STR_UNKNOWN] : d.agroups.split(delimPipe).map((x: any) => x.split(delimColon)[1]),
			genders: !d.genders ? [STR_UNKNOWN] : d.genders.split(delimPipe).map((x: any) => x.split(delimColon)[1]),
			// pstatus: !d.pstatus ? unknown : d.pstatus.split(delimPipe).map((x: any) => x.split(delimColon)[1]),
			// ptype: !d.ptype ? unknown : d.ptype.split(delimPipe).map((x: any) => x.split(delimColon)[1]),
		}
		const lengths: any = [obj.agroups.length, obj.genders.length];
		const max = Math.max(...lengths);

		obj.max = max;

		if (obj.agroups.length < max) {
			const newList = [...obj.agroups];
			for (let i = 0; i < max-obj.agroups.length; i++) {
				newList.push(STR_UNKNOWN);
			}
			obj.agroups = newList;
		}
		if (obj.genders.length < max) {
			const newList = [...obj.genders];
			for (let i = 0; i < max-obj.genders.length; i++) {
				newList.push(STR_UNKNOWN);
			}
			obj.genders = newList;
		}
		// if (obj.pstatus.length < max) {
		// 	const newList = [...obj.pstatus];
		// 	for (let i = 0; i < max-obj.pstatus.length; i++) {
		// 		newList.push(STR_UNKNOWN);
		// 	}
		// 	obj.pstatus = newList;
		// }
		// if (obj.ptype.length < max) {
		// 	const newList = [...obj.ptype];
		// 	for (let i = 0; i < max-obj.ptype.length; i++) {
		// 		newList.push(STR_UNKNOWN);
		// 	}
		// 	obj.ptype = newList;
		// }
		return obj;
	});

	const chartMap = new Map();

	chartData.forEach((d: any) => {
		for (let i = 0; i < d.max; i++) {
			const key = `${d.agroups[i]}|${d.genders[i]}`;
			if (chartMap.has(key)) {
				chartMap.set(key, chartMap.get(key) + 1);
			} else {
				chartMap.set(key, 1);
			}
		}
	});

	const zeroOutData = (key: string) => chartMap.get(key) ? chartMap.get(key) : 0;

	const chartSeries = [
		{
			data: [
				zeroOutData(`${IncidentParticipantAgeGroup.Adult}|${IncidentParticipantGender.Unknown}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Teen}|${IncidentParticipantGender.Unknown}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Child}|${IncidentParticipantGender.Unknown}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Unknown}|${IncidentParticipantGender.Unknown}`)
			]
		},
		{
			data: [
				zeroOutData(`${IncidentParticipantAgeGroup.Adult}|${IncidentParticipantGender.Female}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Teen}|${IncidentParticipantGender.Female}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Child}|${IncidentParticipantGender.Female}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Unknown}|${IncidentParticipantGender.Female}`)
			]
		},
		{
			data: [
				zeroOutData(`${IncidentParticipantAgeGroup.Adult}|${IncidentParticipantGender.Male}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Teen}|${IncidentParticipantGender.Male}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Child}|${IncidentParticipantGender.Male}`),
				zeroOutData(`${IncidentParticipantAgeGroup.Unknown}|${IncidentParticipantGender.Male}`)
			]
		}
	]

	chartSeries.forEach((s: any, i: number) => {
		chartStack.series[i].setData(s.data)
	})

	chartStack.setTitle({ text: title });

}

const setupTimeChart = () => {
	// @ts-ignore
	chartTime = Highcharts.chart('chartTime', {
		chart: {
			zoomType: 'x',
			style: {
				fontFamily: 'Encode Sans Condensed'
			}
		},
		title: {
			text: '',
			align: 'left'
		},
		xAxis: {
			type: 'datetime'
		},
		yAxis: {
			title: {
				text: 'Number of Incidents'
			}
		},
		legend: {
			enabled: false
		},
		plotOptions: {
			area: {
				lineColor: Highcharts.color("#000").setOpacity(.5).get('rgba'),
				fillColor: {
					linearGradient: {
						x1: 0,
						y1: 0,
						x2: 0,
						y2: 1
					},
					stops: [
						[0, "#000"],
						[1, Highcharts.color("#000").setOpacity(0).get('rgba')]
					]
				},
				marker: {
					radius: 2
				},
				lineWidth: 1,
				states: {
					hover: {
						lineWidth: 1
					}
				},
				threshold: null
			}
		},

		series: [{
			type: 'area',
			name: 'Incidents'
		}]
	});
}

const loadTimeChartData = (data: Incident[], title: string) => {
	const msMap = new Map();
	data.forEach((d: Incident) => {
		const dateSplit = d.date.split('/');
		const dateObj = new Date(Number(dateSplit[2]), Number(dateSplit[0]) - 1, Number(dateSplit[1]));
		const ms = dateObj.getTime();
		if (msMap.has(ms)) {
			msMap.set(ms, msMap.get(ms) + 1);
		} else {
			msMap.set(ms, 1);
		}
	});
	const incidentsArray = Array.from(msMap, ([key, value]) => [key, value]);
	chartTime.series[0].setData(incidentsArray)
	chartTime.setTitle({ text: title });
}

const setupBubbleChart = (data: Incident[]) => {

	const stateMap = new Map();
	data.forEach((d: Incident) => {
		const state = findStateByAbbr(d.st)!?.name ? findStateByAbbr(d.st)!?.name : "Unknown";
		if (stateMap.has(state)) {
			stateMap.set(state, stateMap.get(state) + 1);
		} else {
			stateMap.set(state, 1);
		}
	});

	// @ts-ignore
	Highcharts.chart('chartBubble', {
		chart: {
			type: 'packedbubble',
			style: {
				fontFamily: 'Encode Sans Condensed'
			}
		},
		title: {
			text: 'USA Incidents By State',
			align: 'left'
		},
		tooltip: {
			useHTML: true,
			pointFormat: '<b>{point.name}:</b> {point.value}incidents'
		},
		plotOptions: {
			packedbubble: {
				minSize: '1%',
				maxSize: '100%',
				zMin: 0,
				zMax: 1000,
				layoutAlgorithm: {
					splitSeries: false,
					gravitationalConstant: 0.02
				},
				dataLabels: {
					enabled: true,
					format: '{point.name}',
					filter: {
						property: 'y',
						operator: '>',
						value: 250
					},
					style: {
						color: 'black',
						textOutline: 'none',
						fontWeight: 'normal'
					}
				}
			}
		},
		series: [
			{
				name: 'States',
				data: Array.from(stateMap).map((s: any) => {
					return {
						name: s[0],
						value: s[1]
					}
				})
			}
		]
	});
}






// source.entities.values.forEach((entity: any) => {
	// 	console.log(entity);
	// 	const type = entity.properties.TYPE.getValue();
	// 	if (type === "CNY") {
	// 		entity.polygon.show = new ConstantProperty(false);
	// 	} else if (type === "CD") {
	// 		entity.polygon.show = new ConstantProperty(false);
	// 	} else if (type === "ST") {
	// 		entity.polygon.show = new ConstantProperty(false);
	// 		// entity.polygon.material = Color.TRANSPARENT
	// 	}
	// })

	// for (var i = 0; i < entities.length; i++) {
	// 	const entity: any = entities[i];
	// 	if (entity) {
	// 		if (entity?.properties?.GEO_ID.getValue()) {
	// 			if (entity.polygon) {

	// 				let incidents = 0;
	// 				// let multiplier = 50;
	// 				const abbr = findStateByCode(entity.properties.STATE.getValue())?.abbr;

	// 				const type = entity.properties.TYPE.getValue();
	// 				console.log(type);

	// 				if (type === "CNY") {
	// 					const county = US_CNY_MAP.get(`${entity.properties.NAME.getValue()}_${abbr}`);
	// 					if (county) {
	// 						incidents = county.incidents._count;
	// 						// color = county.color;
	// 					}
	// 					entity.polygon.material = Color.TRANSPARENT
	// 				} else if (type === "CD") {
	// 					const cd = US_CD_MAP.get(`${entity.properties.CD.getValue()}_${abbr}`);
	// 					if (cd) {
	// 						incidents = cd.incidents._count;
	// 						// color = cd.color;
	// 					}
	// 					entity.polygon.material = Color.TRANSPARENT
	// 				} else if (type === "ST") {
	// 					const state = US_ST_MAP.get(abbr);
	// 					if (state) {
	// 						incidents = state.incidents._count;
	// 						// color = state.color;
	// 						// multiplier = 30;
	// 					}
	// 					entity.polygon.material = Color.TRANSPARENT
	// 				}


	// 				// console.log(incidents);
	// 				// entity.polygon.outline = new ConstantProperty(false);
	// 				// entity.polygon.extrudedHeight = new ConstantProperty(incidents ? incidents * multiplier : undefined);




	// 			}
	// 		}
	// 	}
	// }


// 	} else {
// 		US_ALL_MAP.forEach((city, key) => {
// 			const name = key.split("_");
// 			const location = city.location.split(",");
// 			const incidents = city.incidents._count;
// 			const scale = incidents / 2;
// 			viewer.entities.add({
// 				name: `${name[0]}, ${name[2]} - ${incidents} incidents`,
// 				position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
// 				point: {
// 					pixelSize: (scale) < 2 ? 4 : scale,
// 					color: Color.WHITE
// 				},
// 			})
// 		})
// 	}
// }






	// const updateGeoGender = (key: string, type: string, map: any) => {
	// 	
	// }
	// const updateGeoAgeGroup = (key: string, type: string, map: any) => {
	// 	map.get(key).incidents.ageGroup[type] = map.get(key).incidents.ageGroup[type] + 1;
	// }
	// const updateGeoKilled = (key: string, map: any) => {
	// 	map.get(key).incidents._killed = map.get(key).incidents._killed + 1;
	// }
	// const updateGeoInjured = (key: string, map: any) => {
	// 	map.get(key).incidents._injured = map.get(key).incidents._injured + 1;
	// }



		// let state = d.st ? d.st : "NOSTATE";
		// let county = d.cny ? formatCounty(d.cny) : "NOCOUNTY";
		// let cd = d.cd?.length < 2 ? `0${d.cd}` : d.cd ? d.cd : "NOCD";
		// let city = d.cty ? d.cty : "NOCITY";
		// let lng = d.lng;
		// let lat = d.lat;

		// // if (!state) { console.log("NO STATE FOUND", d)} 
		// // if (!county) { console.log("NO COUNTY FOUND", d)}
		// // if (!cd) { console.log("NO CD FOUND", d)}
		// // if (!city) { console.log("NO CITY FOUND", d)}
		
		// addToGeoMap(state, US_ST_MAP);
		// addToGeoMap(`${county}_${state}`, US_CNY_MAP);
		// addToGeoMap(`${cd}_${state}`, US_CD_MAP);
		// addToGeoMap(`${city}_${county}_${state}`, US_CTY_MAP, {location: `${lng},${lat}`});
		// addToGeoMap(`${lng},${lat}`, US_ALL_MAP, {location: `${lng},${lat}`});

		// const updateGeoGender = (key: string, type: string, map: any) => {
		// 	map.get(key).incidents.gender[type] = map.get(key).incidents.gender[type] + 1;
		// }
		// const updateGeoAgeGroup = (key: string, type: string, map: any) => {
		// 	map.get(key).incidents.ageGroup[type] = map.get(key).incidents.ageGroup[type] + 1;
		// }
		// const updateGeoKilled = (key: string, map: any) => {
		// 	map.get(key).incidents._killed = map.get(key).incidents._killed + 1;
		// }
		// const updateGeoInjured = (key: string, map: any) => {
		// 	map.get(key).incidents._injured = map.get(key).incidents._injured + 1;
		// }

		// if (Number(d.nkill) > 0) {
		// 	updateGeoKilled(state, US_ST_MAP);
		// }

		// if (Number(d.ninj) > 0) {
		// 	updateGeoInjured(state, US_ST_MAP);
		// }

		// if (d.genders) {
		// 	d.genders.split(delimPipe).forEach(g => {
		// 		if (g.includes(STR_FEMALE)) {
		// 			genderMap.set(STR_FEMALE, genderMap.get(STR_FEMALE)! + 1);
		// 			updateGeoGender(state, STR_FEMALE, US_ST_MAP);
		// 		} else {
		// 			genderMap.set(STR_MALE, genderMap.get(STR_MALE)! + 1);
		// 			updateGeoGender(state, STR_MALE, US_ST_MAP);
		// 		}
		// 	})
		// }

		// if (d.agroups) {
		// 	d.agroups.split(delimPipe).forEach(a => {
		// 		if (a.includes(STR_ADULT)) {
		// 			ageGroupsMap.set(STR_ADULT, ageGroupsMap.get(STR_ADULT)! + 1);
		// 			updateGeoAgeGroup(state, STR_ADULT, US_ST_MAP);
		// 		} else if (a.includes(STR_TEEN)) {
		// 			ageGroupsMap.set(STR_TEEN, ageGroupsMap.get(STR_TEEN)! + 1);
		// 			updateGeoAgeGroup(state, STR_TEEN, US_ST_MAP);
		// 		} else if (a.includes(STR_CHILD)) {
		// 			ageGroupsMap.set(STR_CHILD, ageGroupsMap.get(STR_CHILD)! + 1);
		// 			updateGeoAgeGroup(state, STR_CHILD, US_ST_MAP);
		// 		}
		// 	})
		// }

		// if (d.ages) {
		// 	d.ages.split(delimPipe).forEach(a => {
		// 		let age = a.slice(a.indexOf(delimColon) + 2);
		// 		age.length === 1 ? age = `0${age}` : undefined;
		// 		if (agesMap.has(age)) {
		// 			agesMap.set(age, agesMap.get(age) + 1);
		// 		} else {
		// 			agesMap.set(age, 1);
		// 		}
		// 	})
		// }

		// if (d.attr) {
		// 	d.attr.split(delimPipe).forEach(attr => {
		// 		if (attributesMap.has(attr)) {
		// 			attributesMap.set(attr, attributesMap.get(attr) + 1);
		// 		} else {
		// 			attributesMap.set(attr, 1);
		// 		}
		// 	})
		// }


	// const color1 = {r: 247, g: 89, b: 48};
	// const color2 = {r: 255, g: 243, b: 240};
	// // const color1 = {r: 89, g: 38, b: 77};
	// // const color2 = {r: 251, g: 248, b: 251};

	// let counter = 0;
	// const stColors = generateColorScale(US_ST_MAP.size, color1, color2);
	// US_ST_MAP = new Map(Array.from(US_ST_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	// US_ST_MAP.forEach((value: any, key: any, map: any) => {
	// 	const obj = {
	// 		...value,
	// 		color: Color.fromCssColorString(stColors[counter])
	// 	}
	// 	map.set(key, obj);
	// 	counter++;
	// });
	// counter = 0;
	// const cnyColors = generateColorScale(US_CNY_MAP.size, color1, color2);
	// US_CNY_MAP = new Map(Array.from(US_CNY_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	// US_CNY_MAP.forEach((value: any, key: any, map: any) => {
	// 	const obj = {
	// 		...value,
	// 		color: Color.fromCssColorString(cnyColors[counter])
	// 	}
	// 	map.set(key, obj);
	// 	counter++;
	// });
	// counter = 0;
	// const cdColors = generateColorScale(US_CD_MAP.size, color1, color2);
	// US_CD_MAP = new Map(Array.from(US_CD_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	// US_CD_MAP.forEach((value: any, key: any, map: any) => {
	// 	const obj = {
	// 		...value,
	// 		color: Color.fromCssColorString(cdColors[counter])
	// 	}
	// 	map.set(key, obj);
	// 	counter++;
	// });
	
	// US_CTY_MAP = new Map(Array.from(US_CTY_MAP.entries()).sort());
	// US_ALL_MAP = new Map(Array.from(US_ALL_MAP.entries()).sort());

	// console.log(US_ST_MAP);
	// console.log(US_CNY_MAP);
	// console.log(US_CD_MAP);
	// console.log(US_CTY_MAP);
	// console.log(US_ALL_MAP);

	// agesMap = new Map(Array.from(agesMap.entries()).sort());
	// attributesMap = new Map(Array.from(attributesMap.entries()).sort());

	// console.log(genderMap);
	// console.log(ageGroupsMap);
	// console.log(agesMap);
	// console.log(attributesMap);