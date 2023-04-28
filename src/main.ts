import './style.css'
import { Math as CesiumMath, Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, JulianDate, BoundingSphere, HeadingPitchRange, Cartesian3, PropertyBag, MapboxStyleImageryProvider } from 'cesium'
import * as Highcharts from 'highcharts';
import HC_more from "highcharts/highcharts-more";
HC_more(Highcharts);
import { Incident, findStateByCode, HOME_CAMERA, IncidentParticipantAgeGroup, IncidentParticipantGender, STR_UNKNOWN, IncidentGunCaliber, IncidentGunType, IncidentAttribute } from "./utils";

const fillAlpha = .1;
const outlineAlpha = .25;
const highlightAlpha = .35;

const delimPipe = "||";
const delimColon = "::";

let mapView = "USA";
let mapActiveState = "";
let mapActiveCounty = "";

const mapIncidentEntities: any[] = [];

const incidentTotal: any = document.getElementById("incidentTotal");
let chartStack: any;
let chartTime: any;
let chartBubble: any;
let chartPie: any;

let highlightedEntities: any[] = [];
let cdEntities: any[] = [];
let cnyEntities: any[] = [];
let stEntities: any[] = [];

let countiesMap = new Map();
let cdMap = new Map();

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
		styleId: "clgx5grqi00l101p8hf2bh1cv",
		username: "likens",
		accessToken: MAPBOX_API_KEY
	})
});
const scene = viewer.scene;
const camera = viewer.camera;
const handler = viewer.screenSpaceEventHandler;

let htmlTooltip = document.getElementById("tooltip")!;
const usaNav: any = document.getElementById("usa");
const stateNav: any = document.getElementById("state");
const countyNav: any = document.getElementById("county");
const ellipsis: any = document.getElementById("ellipsis");
const splash: any = document.getElementById("splash");

let allData: any[] = [];

let jsonLoaded = false;
let mapLoaded = false;

let text = ellipsis.textContent;
let dotCount = 0;

const loading = setInterval(function() {
	if (dotCount < 3) {
		text += ".";
		dotCount++;
	} else {
		text = text.slice(0, -3);
		dotCount = 0;
	}
	ellipsis.textContent = text;
}, 500);

const dataCheck = setInterval(() => {
	if (jsonLoaded && mapLoaded) {
		clearInterval(loading);
		clearInterval(dataCheck);
		splash.classList.add("opacity-0", "invisible");
	}
}, 5000);

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
			updateDataViews(allData, 'USA');
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
			updateDataViews(incidentData, stateNav.innerHTML);
		}
	})

	allData = data[0];
	setupInitCamera();
	setupDataSources();
	setupBarChart();
	setupTimeChart();
	setupBubbleChart();
	setupPieChart();
	updateDataViews(data[0], 'USA');
	jsonLoaded = true;

})

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
				return Color.clone(Color.WHITE.withAlpha(highlightAlpha), r);
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
					<br/>
					${props.PSTATUS ? props.PSTATUS : ``}
					<br/>
					${props.GTYPE ? props.GTYPE : ``}
				`
				// ${props.INJURED ? `<br/> ${props.INJURED} injured` : ``}
				// ${props.KILLED ? `<br/> ${props.KILLED} killed` : ``}
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
			updateDataViews(incidentData, entityName);

		} else if (entityType === "CNY") {

			const countyFull = `${entityName}${entityLSAD ? ` ${entityLSAD}` : ``}`;
			countyNav.classList.remove("hidden");
			countyNav.innerHTML = countyFull;
			mapActiveCounty = countyFull;
			const stateProp = props.STATE.getValue();
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
				if (incident.st === findStateByCode(stateProp)?.abbr) {
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
			updateDataViews(incidentData, `${countyFull}, ${findStateByCode(stateProp)?.abbr}`);

		}

		flyToPolygon(pickedEntity.id.polygon);

	}

}, ScreenSpaceEventType.LEFT_CLICK);

const setupDataSources = () => {

	const stDataSource = GeoJsonDataSource.load("us_st.json").then((source) => {
		viewer.dataSources.add(source);
		stEntities = source.entities.values;
		for (var i = 0; i < stEntities.length; i++) {
			stEntities[i].polygon.material = updateMaterial(stEntities[i], Color.WHITE.withAlpha(fillAlpha));
			stEntities[i].polygon.outline = true;
			stEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
		}
	})

	const cdDataSource = GeoJsonDataSource.load("us_cd.json").then((source) => {
		viewer.dataSources.add(source);
		cdEntities = source.entities.values;
		for (var i = 0; i < cdEntities.length; i++) {
			cdEntities[i].show = false;
			cdEntities[i].polygon.material = updateMaterial(cdEntities[i], Color.WHITE.withAlpha(fillAlpha));
			cdEntities[i].polygon.outline = true;
			cdEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
		}
	})

	const cnyDataSource = GeoJsonDataSource.load("us_cny.json").then((source) => {
		viewer.dataSources.add(source);
		cnyEntities = source.entities.values;
		for (var i = 0; i < cnyEntities.length; i++) {
			cnyEntities[i].show = false;
			cnyEntities[i].polygon.material = updateMaterial(cnyEntities[i], Color.WHITE.withAlpha(fillAlpha));
			cnyEntities[i].polygon.outline = true;
			cnyEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
		}
	})

	Promise.all([stDataSource, cdDataSource, cnyDataSource]).then(_d => {
		mapLoaded = true;
	});
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
		// props.addProperty("CD", incident.cd);
		props.addProperty("CITY", incident.cty ? incident.cty : incident.cny);
		props.addProperty("DATE", incident.date);
		props.addProperty("GVAID", incident.id);
		incident.nkill ? props.addProperty("KILLED", incident.nkill) : ``;
		incident.ninj ? props.addProperty("INJURED", incident.ninj) : ``;

		if (incident.gtype) {
			const gtype = incident.gtype.split(delimPipe).map((x: any) => x.split(delimColon)[1]);
			const typeMap = new Map();
			gtype.forEach((type: any) => {
				if (typeMap.has(type)) {
					typeMap.set(type, typeMap.get(type) + 1);
				} else {
					typeMap.set(type, 1);
				}
			})
			let gTypeDisplay: any = "";
			Array.from(typeMap).forEach((type: any) => {
				gTypeDisplay = `
					${gTypeDisplay} ${type[1]} ${type[0]},
				`
			});
			props.addProperty("GTYPE", gTypeDisplay);
		}

		const pstatus = incident?.pstatus?.split(delimPipe).map((x: any) => x.split(delimColon)[1]);

		if (pstatus?.length) {
			const statusMap = new Map();
			pstatus.forEach((status: any) => {
				if (statusMap.has(status)) {
					statusMap.set(status, statusMap.get(status) + 1);
				} else {
					statusMap.set(status, 1);
				}
			})
			let pStatusDisplay: any = "";
			Array.from(statusMap).forEach((status: any) => {
				pStatusDisplay = `${pStatusDisplay} ${status[1]} ${status[0]},`
			});
			props.addProperty("PSTATUS", pStatusDisplay);
		}

		console.log(pstatus);

		let color = Color.WHITE;
		if (Number(incident.nkill) > 0) {
			color = Color.fromCssColorString("#b91c1c");
		} else if (Number(incident.ninj) > 0) {
			color = Color.fromCssColorString("#facc15");
		} else if (pstatus?.length) {
			// FINISH
			// color = Color.fromCssColorString("#22c55e");
		} else {
			color = Color.fromCssColorString("#2563eb");
		}
		const entity: any = viewer.entities.add({
			show: true,
			position: Cartesian3.fromDegrees(Number(incident.lng), Number(incident.lat), 0),
			point: {
				pixelSize: 6,
				color: color,
				outlineWidth: 0
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
		offset: new HeadingPitchRange(0, CesiumMath.toRadians(-75), boundingSphere.radius * 3),
	});
}

const updateIncidentTotal = (total: number, name: string) => {
	incidentTotal.innerHTML = `${total} total incidents <br/> within ${name}`;
}

const setupBarChart = () => {
	// @ts-ignore
	chartStack = Highcharts.chart('chartStack', {
		chart: {
			type: 'column',
			height: "100%",
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'By Age Range and Gender',
			align: 'center'
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
			{ name: IncidentParticipantGender.Unknown, color: '#9DB4C0' },
			{ name: IncidentParticipantGender.Female, color: '#f472b6' },
			{ name: IncidentParticipantGender.Male, color: '#60a5fa' }
		]
		// options - see https://api.highcharts.com/highcharts
	});
}

const loadBarChartData = (data: Incident[]) => {

	const chartData = data.map((d: Incident) => {
		const obj: any = {
			max: 1,
			agroups: !d.agroups ? [STR_UNKNOWN] : d.agroups.split(delimPipe).map((x: any) => x.split(delimColon)[1]),
			genders: !d.genders ? [STR_UNKNOWN] : d.genders.split(delimPipe).map((x: any) => x.split(delimColon)[1])
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
}

const setupTimeChart = () => {
	// @ts-ignore
	chartTime = Highcharts.chart('chartTime', {
		chart: {
			zoomType: 'x',
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'Incidents Over Time (2014-2017)',
			align: 'center'
		},
		xAxis: {
			type: 'datetime'
		},
		yAxis: {
			title: {
				text: ''
			}
		},
		legend: {
			enabled: false
		},
		plotOptions: {
			area: {
				lineColor: Highcharts.color("#a1a1aa").setOpacity(.5).get('rgba'),
				fillColor: {
					linearGradient: {
						x1: 0,
						y1: 0,
						x2: 0,
						y2: 1
					},
					stops: [
						// Zinc 400 to 950
						[0, "#09090b"],
						[1, Highcharts.color("#a1a1aa").setOpacity(0).get('rgba')]
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

const loadTimeChartData = (data: Incident[]) => {
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
}

const setupBubbleChart = () => {
	const colors = ['#9DB4C0', '#0369A1', '#022C22', '#3B0764', '#713F12', '#0E2127', '#881337', '#38bdf8'];
	// @ts-ignore
	chartBubble = Highcharts.chart('chartBubble', {
		chart: {
			type: 'packedbubble',
			height: "100%",
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'By Gun Type',
			align: 'center'
		},
		tooltip: {
			enabled: false,
			useHTML: true,
			pointFormat: '<strong>{point.name}</strong> involved in <strong>{point.value}</strong> incidents'
		},
		plotOptions: {
			packedbubble: {
				minSize: '60%',
				maxSize: '120%',
				zMin: 0,
				zMax: 1000,
				layoutAlgorithm: {
					splitSeries: false,
					gravitationalConstant: 0.02
				},
				dataLabels: {
					allowOverlap: true,
					enabled: true,
					format: '<div class="text-center"><div class="text-lg">{point.value}</div><div>{point.name}</div></div>',
					useHTML: true,
					style: {
						color: 'black',
						textOutline: 'none',
						fontWeight: 'normal'
					}
				}
			}
		},
		series: [
			{ name: IncidentGunType.Handgun, color: colors[1] },
			{ name: IncidentGunType.Rifle , color: colors[2] },
			{ name: IncidentGunType.Shotgun , color: colors[3] },
			{ name: IncidentGunType.Other , color: colors[4] },
			{ name: IncidentGunType.Unknown , color: colors[0] }
		]
	});
}

const loadBubbleChartData = (data: Incident[]) => {

	const chartData = data.map((d: Incident) => {
		const obj: any = {
			gtype: !d.gtype ? [STR_UNKNOWN] : d.gtype.split(delimPipe).map((x: any) => {
				const type =  x.split(delimColon)[1];
				if (type.includes(IncidentGunCaliber.Cal762)) {
					return IncidentGunCaliber.Cal762;
				} else if (type.includes(IncidentGunCaliber.Cal223Rem)) {
					return IncidentGunCaliber.Cal223Rem;
				} else {
					return type;
				}
			})
		}
		return obj;
	});
	
	const notSpecified = "Not Specified";
	const handgunMap: any = new Map([[notSpecified, 0]]);
	const rifleMap: any = new Map([[notSpecified, 0]]);
	const shotgunMap: any = new Map([[notSpecified, 0]]);
	const otherMap: any = new Map([["Other", 0]]);
	const unknownMap: any = new Map([["Unknown", 0]]);

	chartData.forEach((g: any) => {
		g.gtype.forEach((type: any) => {
			switch (type) {
				case IncidentGunCaliber.Cal357Mag: 
				case IncidentGunCaliber.Cal40SW: 
				case IncidentGunCaliber.Cal45Auto: 
				case IncidentGunCaliber.Cal9mm: 
				case IncidentGunCaliber.Cal38Spl: 
				case IncidentGunCaliber.Cal25Auto: 
				case IncidentGunCaliber.Cal32Auto: 
				case IncidentGunCaliber.Cal380Auto: 
				case IncidentGunCaliber.Cal44Mag: 
				case IncidentGunCaliber.Cal10mm:
					if (handgunMap.has(type)) {
						handgunMap.set(type, handgunMap.get(type) + 1);
					} else {
						handgunMap.set(type, 1);
					}
					break;
				case IncidentGunCaliber.Cal22LR: 
				case IncidentGunCaliber.Cal3030Win: 
				case IncidentGunCaliber.Cal762: 
				case IncidentGunCaliber.Cal308Win: 
				case IncidentGunCaliber.Cal223Rem: 
				case IncidentGunCaliber.Cal3006Spr: 
				case IncidentGunCaliber.Cal300Win:
					if (rifleMap.has(type)) {
						rifleMap.set(type, rifleMap.get(type) + 1);
					} else {
						rifleMap.set(type, 1);
					}
					break;
				case IncidentGunCaliber.Cal16Gauge: 
				case IncidentGunCaliber.Cal12Gauge: 
				case IncidentGunCaliber.Cal410Gauge: 
				case IncidentGunCaliber.Cal20Gauge: 
				case IncidentGunCaliber.Cal28Gauge: 
				case IncidentGunCaliber.Cal3006Spr: 
				case IncidentGunCaliber.Cal300Win:
					if (shotgunMap.has(type)) {
						shotgunMap.set(type, shotgunMap.get(type) + 1);
					} else {
						shotgunMap.set(type, 1);
					}
					break;
				default:
					switch (type) {
						case IncidentGunType.Handgun:
							handgunMap.set(notSpecified, handgunMap.get(notSpecified) + 1);
							break;
						case IncidentGunType.Rifle:
							rifleMap.set(notSpecified, rifleMap.get(notSpecified) + 1);
							break;
						case IncidentGunType.Shotgun:
							shotgunMap.set(notSpecified, shotgunMap.get(notSpecified) + 1);
							break;
						case IncidentGunType.Other:
							otherMap.set("Other", otherMap.get("Other") + 1);
							break;
						default:
							unknownMap.set("Unknown", unknownMap.get("Unknown") + 1);
							break;
					}
					break;
			}
		})
	});

	const allMaps = [handgunMap, rifleMap, shotgunMap, otherMap, unknownMap];
	allMaps.forEach((map: any, i: number) => {
		const series = Array.from(map).map((m: any) => {
			return { name: m[0], value: m[1] }
		});
		chartBubble.series[i].setData(series);
	})

}

const setupPieChart = () => {
	// var colors = ['#AFDAF5', '#F88FB3']
	const attrColors = ['#9DB4C0', '#0369A1', '#022C22', '#3B0764', '#713F12', '#0E2127', '#881337', '#dc2626', '#14b8a6','#ca8a04','#171717' ];
	const statusColors= ['#facc15','#b91c1c','#22c55e','#2563eb']
	// @ts-ignore
	chartPie = Highcharts.chart('chartPie', {
		chart: {
			type: 'pie',
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'By Incident Attribute',
			align: 'center'
		},
		subtitle: {
			text: 'Click the slices to view attribute breakdown',
			align: 'center'
		},

		accessibility: {
			announceNewData: {
				enabled: true
			},
			point: {
				valueSuffix: '%'
			}
		},

		plotOptions: {
			series: {
				dataLabels: {
					enabled: true,
					format: '{point.name}: {point.y:.1f}%',
					style: {
						fontSize: 12 + 'px'
					}
				}
			}
		},

		tooltip: {
			headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
			pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
		},

		series: [
			{
				name: 'Incident Attributes',
				colorByPoint: true,
				data: [
				{
					name: 'Accidental Shooting',
					color: attrColors[0],
					y: 23,
					drilldown: 'Accidental Shooting'
				},
				{
					name: 'Child Involved Incident',
					color: attrColors[1],
					y: 24,
					drilldown: 'Child Involved Incident'
				},
				{
					name: 'Defensive Use',
					color: attrColors[2],
					y: 7,
					drilldown: 'Defensive Use'
				},
				{
					name: 'Domestic Violence',
					color: attrColors[3],
					y: 7,
					drilldown: 'Domestic Violence'
				}
				,
				{
					name: 'Drug Involvement',
					color: attrColors[4],
					y: 7,
					drilldown: 'Drug Involvement'
				},
				{
					name: 'Gang Involvement',
					color: attrColors[5],
					y: 7,
					drilldown: 'Gang Involvement'
				}, 
				{
					name: 'Home Invasion',
					color: attrColors[6],
					y: 10,
					drilldown: 'Home Invasion'
				},
				{
					name: 'Mass Shooting',
					color: attrColors[7],
					y: 16,
					drilldown: 'Mass Shooting'
				},
				{
					name: 'Officer Involved Shooting',
					color: attrColors[8],
					y: 16,
					drilldown: 'Officer Involved Shooting'
				}
				,
				{
					name: 'School Shooting',
					color: attrColors[9],
					y: 16,
					drilldown: 'School Shooting'
				},
				{
					name: 'Suicide',
					color: attrColors[10],
					y: 10,
					drilldown: 'Suicide'
				}
			]
			}
		],
		drilldown: {
			series: [{
				name: 'Gang Violence',
				id: 'Gang Violence',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}, {
				name: 'Home Invasion',
				id: 'Home Invasion',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}, {
				name: 'Defensive Use',
				id: 'Defensive Use',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}, {
				name: 'Child Involved Incident',
				id: 'Child Involved Incident',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}, {
				name: 'Accidental Shooting',
				id: 'Accidental Shooting',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}, {
				name: 'Other',
				id: 'Other',
				data: [{
					name: 'Injured',
					y: 70,
					color: statusColors[0]
				},
				{
					name: 'Killed',
					y: 10,
					color: statusColors[1]
				},
				{
					name: 'Unharmed',
					y: 10,
					color: statusColors[2]
				},
				{
					name: 'Arrested',
					y: 10,
					color: statusColors[3]
				}]
			}]
		}
	});
	console.log(chartPie)
}

const loadPieChartData = (data: Incident[]) => {
	const accidentalMap = new Map([
		[`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Injury}`, 0],
		[`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Death}`, 0],
		[`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Business}`, 0],
		[`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`, 0],
	]);
	// const childMap = new Map();
	data.forEach((d: any) => {

		const attr = d.attr?.split(delimPipe);

		if (attr) {

			const accidental = attr?.filter((a: any) => a.includes(IncidentAttribute.AccidentalShooting)).map((a: any) => a.replace(IncidentAttribute.AccidentalShooting, ""));
			if (accidental?.length === 1) {
				accidentalMap.set(
					`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`,
					accidentalMap.get(`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`)! + 1);
			} else if (accidental?.length) {
				accidental?.forEach((a: any) => {
					if (!a) {
						accidentalMap.set(
							`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`,
							accidentalMap.get(`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`)! + 1);
					} else if (a.includes(IncidentAttribute.Business)) {
						accidentalMap.set(
							`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Business}`,
							accidentalMap.get(`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Business}`)! + 1);
					} else if (a.includes(IncidentAttribute.Injury)) {
						accidentalMap.set(
							`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Injury}`,
							accidentalMap.get(`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Business}`)! + 1);
					} else if (a.includes(IncidentAttribute.Death)) {
						accidentalMap.set(
							`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Death}`,
							accidentalMap.get(`${IncidentAttribute.AccidentalShooting}|${IncidentAttribute.Death}`)! + 1);
					}
				})
			}

			const children = attr.filter((a: any) => a.includes(IncidentAttribute.ChildInvolvedIncident));

			if (children?.length) {
				// console.log(children);
			}
		}


	});
	console.log(accidentalMap);
}

const updateDataViews = (data: Incident[], title: string) => {
	loadBarChartData(data);
	loadTimeChartData(data);
	loadBubbleChartData(data);
	loadPieChartData(data);
	updateIncidentTotal(data.length, title);
}