import './style.css'
import { Math as CesiumMath, Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, JulianDate, BoundingSphere, HeadingPitchRange, Cartesian3, PropertyBag, MapboxStyleImageryProvider } from 'cesium'
import * as Highcharts from 'highcharts';
import HC_more from "highcharts/highcharts-more";
HC_more(Highcharts);
import { Incident, findStateByCode, HOME_CAMERA, IncidentParticipantAgeGroup, IncidentParticipantGender, STR_UNKNOWN, IncidentGunCaliber, IncidentGunType, IncidentAttribute, IncidentParticipantStatus } from "./utils";

const fillAlpha = .1;
const outlineAlpha = .25;
const highlightAlpha = .35;

const delimPipe = "||";
const delimColon = "::";

let mapView = "USA";
let mapActiveState = "";
// let mapActiveCountyDistrict = "";

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
let htmlOverlay = document.getElementById("overlay")!;
let overlayTitle = document.getElementById("overlayTitle")!;
let overlayContent = document.getElementById("overlayContent")!;
// let stateFork = document.getElementById("stateFork")!;
// let stateCounties = document.getElementById("stateCounties")!;
// let stateDistricts = document.getElementById("stateDistricts")!;
const usaNav: any = document.getElementById("usa");
const stateNav: any = document.getElementById("state");
const countyDistrictNav: any = document.getElementById("countyDistrict");
const ellipsis: any = document.getElementById("ellipsis");
const splash: any = document.getElementById("splash");

let allData: any[] = [];

const stateTotals = new Map();
const countyTotals = new Map();

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
			// mapActiveCountyDistrict = "";
			stEntities.forEach((entity: any) => entity.show = true);
			cnyEntities.forEach((entity: any) => entity.show = false);
			// cdEntities.forEach((entity: any) => entity.show = false);
			clearIncidentEntities();
			camera.flyTo(HOME_CAMERA);
			stateNav.classList.add("hidden");
			stateNav.innerHTML = "";
			countyDistrictNav.classList.add("hidden");
			countyDistrictNav.innerHTML = "";
			updateDataViews(allData, 'USA');
			htmlOverlay.classList.add("hidden");
			// stateFork.classList.remove("grid");
			// stateFork.classList.add("hidden");
		}
	})
	
	stateNav?.addEventListener('click', () => {
		if (mapView !== "ST") {
			mapView = "ST";
			// mapActiveCountyDistrict = "";
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
			// cdEntities.forEach((entity: any) => entity.show = false);
			countyDistrictNav.innerHTML = "";
			countyDistrictNav.classList.add("hidden");
			
			const incidentData = allData.filter((incident: Incident) => incident.st === findStateByCode(mapActiveState)?.abbr);

			clearIncidentEntities();
			updateDataViews(incidentData, stateNav.innerHTML);
			htmlOverlay.classList.add("hidden");
			// stateFork.classList.add("grid");
			// stateFork.classList.remove("hidden");
		}
	});

	allData = data[0];

	allData.forEach((d: any) => {
		if (stateTotals.has(d.st)) {
			stateTotals.set(d.st, stateTotals.get(d.st) + 1);
		} else {
			stateTotals.set(d.st, 1);
		}

		const county = `${!d.cny ? d.cty : d.cny}, ${d.st}`;

		if (countyTotals.has(county)) {
			countyTotals.set(county, countyTotals.get(county) + 1);
		} else {
			countyTotals.set(county, 1);
		}
	})

	setupInitCamera();
	setupDataSources();
	setupBarChart();
	setupTimeChart();
	setupBubbleChart();
	setupPieChart();
	updateDataViews(data[0], 'USA');
	jsonLoaded = true;

	// stateCounties.addEventListener('click', () => {
	// 	// go through all counties
	// 	// show only the counties that
	// 	// are in the picked state
	// 	cnyEntities.forEach((entity: any) => {
	// 		const props = entity.properties;
	// 		// show "sibling" counties,
	// 		// hide all others
	// 		if (mapActiveState === props.STATE.getValue()) {
	// 			entity.show = true;
	// 			stateFork.classList.remove("grid");
	// 			stateFork.classList.add("hidden");
	// 		} else {
	// 			entity.show = false;
	// 		}
	// 	})
	// })

	// stateDistricts.addEventListener('click', () => {
	// 	// go through all districts
	// 	// show only the districts that
	// 	// are in the picked state
	// 	cdEntities.forEach((entity: any) => {
	// 		const props = entity.properties;
	// 		// show "sibling" districts,
	// 		// hide all others
	// 		if (mapActiveState === props.STATE.getValue()) {
	// 			entity.show = true;
	// 			stateFork.classList.remove("grid");
	// 			stateFork.classList.add("hidden");
	// 		} else {
	// 			entity.show = false;
	// 		}
	// 	})
	// })

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

const updateMaterial = (entity: Entity, color: Color, alpha = true) => {
	const colorProperty = new CallbackProperty((_t, r) => {
		if (highlightedEntities.length) {
			if (highlightedEntities.find((e: Entity) => e.id === entity.id)) {
				return Color.clone(!alpha ? Color.WHITE : Color.WHITE.withAlpha(highlightAlpha), r);
			}
		}
		return Color.clone(!alpha ? color : color.withAlpha(fillAlpha), r);
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
		htmlTooltip.classList.remove('grid');
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

			if (props.GVAID) {
				tooltipText = `<div class="grid gap-1"><div class="text-xl">${props.CITY}, ${props.STATE} - ${props.DATE}</div><div class="text-sm">(click for details)</div></div>`
			} else if (props.COUNTY) {
				const title = `${props.NAME} ${props.LSAD}, ${findStateByCode(props.STATE)?.abbr}`;
				const total = pickedObject.properties._TOTAL;
				tooltipText = `<div class="grid gap-1"><div class="text-xl">${title}</div><div class="text-sm">${total?.toLocaleString()} incidents</div></div>`;
			} 
			// else if (props.CD) {
			// 	const title = `District #${props.CD}, ${findStateByCode(props.STATE)?.abbr}`
			// 	tooltipText = `<div class="grid gap-1"><div class="text-xl">${title}</div><div class="text-sm">incidents</div></div>`;
			// } 
			else {
				const total = pickedObject.properties._TOTAL;
				tooltipText = `<div class="grid gap-1"><div class="text-xl">${props.NAME}</div><div class="text-sm">${total?.toLocaleString()} incidents</div></div>`;
			}
		}

		const xModifier = 25// props.GVAID ? 2 : 25;
		const yModifier = 0// props.GVAID ? -30 : 0;
		
		htmlTooltip.innerHTML = tooltipText;
		htmlTooltip.style.transform = `translate(${xPosition + xModifier}px, ${yPosition + yModifier}px)`;
		htmlTooltip.classList.add('grid');
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
		const entityType = props.TYPE?.getValue();
		// const entityCD = props.CD?.getValue();

		if (entityType === "ST") {

			mapView = props.TYPE.getValue();
			countyDistrictNav.classList.add("hidden");
			countyDistrictNav.innerHTML = "";
			stateNav.classList.remove("hidden");
			stateNav.innerHTML = `\\ ${entityName}`;
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
					// const center = BoundingSphere.fromPoints(pickedEntity.id.polygon.hierarchy.getValue().positions).center;
					// stateFork.classList.remove("hidden");
					// stateFork.classList.add("grid");

					// viewer.scene.preRender.addEventListener(() => {
					// 	const position = viewer.scene.cartesianToCanvasCoordinates(center, new Cartesian2());
					// 	stateFork.style.transform = `translate(${position.x - 50}px, ${position.y - 50}px)`;
					// });

				} else {
					entity.show = true;
				}
			})

			clearIncidentEntities();
			updateDataViews(incidentData, entityName);
			htmlOverlay.classList.add("hidden");
			flyToPolygon(pickedEntity.id.polygon);

		} else if (entityType === "CNY") {

			mapView = props.TYPE.getValue();
			const countyFull = `${entityName}${entityLSAD ? ` ${entityLSAD}` : ``}`;
			countyDistrictNav.classList.remove("hidden");
			countyDistrictNav.innerHTML = `\\ ${countyFull}`;
			// mapActiveCountyDistrict = countyFull;
			const stateProp = props.STATE.getValue();

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
			htmlOverlay.classList.add("hidden");
			flyToPolygon(pickedEntity.id.polygon);

		} 
		// else if (entityType === "CD") {

		// 	mapView = props.TYPE.getValue();
		// 	const entityCD = props.CD.getValue();
		// 	const cdFull = `District #${entityName}`;
		// 	countyDistrictNav.classList.remove("hidden");
		// 	countyDistrictNav.innerHTML = cdFull;
		// 	mapActiveCountyDistrict = cdFull;
		// 	const stateProp = props.STATE.getValue();

		// 	cdEntities.forEach((entity: any) => {
		// 		const props = entity.properties;
		// 		// show "sibling" district,
		// 		// hide all others
		// 		if (entityState === props.STATE.getValue()) {
		// 			entity.show = true;
		// 		} else {
		// 			entity.show = false;
		// 		}
		// 	});

		// 	// hide our picked district
		// 	pickedEntity.id.show = false;

		// 	const incidentData = allData.filter((incident: Incident) => {
		// 		if (incident.cd && incident.st === findStateByCode(stateProp)?.abbr) {
		// 			const cd = incident.cd.length === 1 ? `0${incident.cd}` : incident.cd;
		// 			if (cd === entityCD) {
		// 				console.log(entityCD, cd);
		// 				return incident;
		// 			}
		// 		}
				
		// 		return;
		// 	});

		// 	clearIncidentEntities();
		// 	addIncidentEntities(incidentData);
		// 	updateDataViews(incidentData, `${cdFull}, ${findStateByCode(stateProp)?.abbr}`);
		// 	htmlOverlay.classList.add("hidden");
		// 	flyToPolygon(pickedEntity.id.polygon);
			
		// } 
		else if (props.GVAID) {
			const pos = pickedEntity.id.position.getValue(viewer.clock.currentTime);
			htmlOverlay.classList.remove("hidden");
			htmlOverlay.classList.add("grid");
			const incidentTitle = `${props.CITY}, ${props.STATE} - ${props.DATE}`;
			const incidentContent = `
				<div class="grid gap-2 grid-cols-[max-content_minmax(250px,_400px)]">
					${props.ATTR ? `<div class="text-sm contents">${props.ATTR}</div>` : ``}
					${props.PSTATUS ? `<div class="text-sm contents">${props.PSTATUS}</div>` : ``}
					${props.GTYPE ? `<div class="text-sm contents">${props.GTYPE}</div>` : ``}
				</div>
				<div class="text-right text-lg font-bold uppercase">
					<a href="https://gunviolencearchive.org/incident/${props.GVAID}" target="_blank" class="hover:underline">GVA Source ↗</a>
				</div>
			`;
			overlayTitle.innerHTML = incidentTitle;
			overlayContent.innerHTML = incidentContent;
			viewer.scene.preRender.addEventListener(() => {
				const position = viewer.scene.cartesianToCanvasCoordinates(pos, new Cartesian2());
				if (position) {
					htmlOverlay.style.transform = `translate(${position.x + 5}px, ${position.y}px)`;
				}
			})

		}

	}

}, ScreenSpaceEventType.LEFT_CLICK);

const setupDataSources = () => {

	const stDataSource = GeoJsonDataSource.load("us_st.json").then((source) => {
		viewer.dataSources.add(source);
		stEntities = source.entities.values;
		for (var i = 0; i < stEntities.length; i++) {
			stEntities[i].properties._TOTAL = stateTotals.get(findStateByCode(stEntities[i].properties.STATE.getValue())?.abbr);
			stEntities[i].polygon.material = updateMaterial(stEntities[i], Color.WHITE);
			stEntities[i].polygon.outline = true;
			stEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
		}
	})

	// const cdDataSource = GeoJsonDataSource.load("us_cd.json").then((source) => {
	// 	viewer.dataSources.add(source);
	// 	cdEntities = source.entities.values;
	// 	for (var i = 0; i < cdEntities.length; i++) {
	// 		cdEntities[i].show = false;
	// 		cdEntities[i].polygon.material = updateMaterial(cdEntities[i], Color.WHITE.withAlpha(fillAlpha));
	// 		cdEntities[i].polygon.outline = true;
	// 		cdEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
	// 	}
	// })

	const cnyDataSource = GeoJsonDataSource.load("us_cny.json").then((source) => {
		viewer.dataSources.add(source);
		cnyEntities = source.entities.values;
		for (var i = 0; i < cnyEntities.length; i++) {
			const props = cnyEntities[i].properties;
			props._TOTAL = countyTotals.get(`${props.NAME.getValue()} ${props.LSAD.getValue()}, ${findStateByCode(props.STATE.getValue())?.abbr}`);
			cnyEntities[i].show = false;
			cnyEntities[i].polygon.material = updateMaterial(cnyEntities[i], Color.WHITE);
			cnyEntities[i].polygon.outline = true;
			cnyEntities[i].polygon.outlineColor = Color.WHITE.withAlpha(outlineAlpha);
		}
	})

	Promise.all([stDataSource, cnyDataSource]).then(_d => {
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
		props.addProperty("DISTRICT", incident.cd);
		props.addProperty("CITY", incident.cty ? incident.cty : incident.cny);
		props.addProperty("STATE", incident.st ? incident.st : ``);
		props.addProperty("DATE", incident.date);
		props.addProperty("GVAID", incident.id);
		incident.nkill ? props.addProperty("KILLED", incident.nkill) : ``;
		incident.ninj ? props.addProperty("INJURED", incident.ninj) : ``;

		if (incident.attr) {
			const attr = incident.attr.split(delimPipe);
			const attrMap = new Map();
			attr.forEach((a: any) => {
				if (attrMap.has(a)) {
					attrMap.set(a, attrMap.get(a) + 1);
				} else {
					attrMap.set(a, 1);
				}
			})
			let attrDisplay: any = "";
			const attrMapArr = Array.from(attrMap)
			attrMapArr.forEach((attr: any, i: number) => {
				attrDisplay = `${attrDisplay} <div>${attr[0]}${i !== attrMapArr.length - 1 ? `, ` : ``}</div>`
			});
			props.addProperty("ATTR", `<div>Attribute(s):</div><div>${attrDisplay}</div>`);
		}

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
			const typeMapArr = Array.from(typeMap)
			typeMapArr.forEach((type: any, i: number) => {
				gTypeDisplay = `${gTypeDisplay} <div>${type[1]} ${type[0]}${i !== typeMapArr.length - 1 ? `, ` : ``}</div>`
			});
			props.addProperty("GTYPE", `<div>Gun(s):</div><div>${gTypeDisplay}</div>`);
		}

		const pstatus = incident?.pstatus?.split(delimPipe).map((x: any) => x.split(delimColon)[1]);
		let pstatusTotal = 1;

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
			const statusMapArr = Array.from(statusMap);
			statusMapArr.forEach((status: any, i: number) => {
				pstatusTotal = pstatusTotal + status[1];
				pStatusDisplay = `${pStatusDisplay} <div>${status[1]} ${status[0]}${i !== statusMapArr.length - 1 ? `, ` : ``}</div>`;
			});
			props.addProperty("PSTATUS", `<div>Participant(s):</div><div>${pStatusDisplay}</div>`);
		}

		let color = Color.WHITE;
		if (Number(incident.nkill) > 0) {
			color = Color.fromCssColorString("#b91c1c");
		} else if (Number(incident.ninj) > 0) {
			color = Color.fromCssColorString("#facc15");
		} else if (pstatus?.length) {
			pstatus.forEach((status: any) => {
				if (status.includes(IncidentParticipantStatus.Arrested)) {
					color = Color.fromCssColorString("#22c55e");
				} else {
					color = Color.fromCssColorString("#2563eb");
				}
			})
		}
		const entity: any = viewer.entities.add({
			show: true,
			position: Cartesian3.fromDegrees(Number(incident.lng), Number(incident.lat), 0),
			point: {
				pixelSize: 6,
				color: color,
				outlineWidth: 0
			},
			ellipse: {
				semiMajorAxis: 50,
				semiMinorAxis: 50,
				material: new ColorMaterialProperty(color),
				extrudedHeight: 100 * (pstatusTotal * 2)
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
	incidentTotal.innerHTML = `${total.toLocaleString()} total incidents within ${name}`;
}

const setupBarChart = () => {
	// @ts-ignore
	chartStack = Highcharts.chart('chartStack', {
		chart: {
			type: 'column',
			height: "100%",
			backgroundColor: "transparent",
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'By Age Range and Gender',
			align: 'center',
			style: {
				color: "#fff"
			}
		},
		xAxis: {
			categories: [
				IncidentParticipantAgeGroup.Adult,
				IncidentParticipantAgeGroup.Teen,
				IncidentParticipantAgeGroup.Child,
				IncidentParticipantAgeGroup.Unknown
			],
			labels: {
				enabled: false,
				style: {
					color: "#94a3b8"
				}
			},
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		yAxis: {
			min: 0,
			title: {
				text: ''
			},
			labels: {
				style: {
					color: "#94a3b8"
				}
			},
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		legend: {
			reversed: true,
			itemStyle: {
				color: "#fff"
			},
			itemHoverStyle: {
				color: "#94a3b8"
			}
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
		],
		credits: {
			enabled: false
		}
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
			backgroundColor: "transparent",
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'Incidents Per Day',
			align: 'center',
			style: {
				color: "#fff"
			}
		},
		subtitle: {
			text: 'Click and drag to zoom into a time period',
			align: 'center',
			style: {
				color: "#fff"
			}
		},
		xAxis: {
			type: 'datetime',
			labels: {
				enabled: false,
				style: {
					color: "#94a3b8"
				}
			},
			tickColor: "transparent",
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		yAxis: {
			title: "",
			labels: {
				style: {
					color: "#94a3b8"
				}
			},
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		legend: {
			enabled: false
		},
		plotOptions: {
			area: {
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
		}],
		credits: {
			enabled: false
		}
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
			backgroundColor: "transparent",
			style: {
				fontFamily: 'League Mono'
			}
		},
		title: {
			text: 'By Gun Type',
			align: 'center',
			style: {
				color: "#fff"
			}
		},
		tooltip: {
			enabled: false,
			useHTML: true,
			pointFormat: '<strong>{point.name}</strong> involved in <strong>{point.value}</strong> incidents'
		},
		legend: {
			itemStyle: {
				color: "#fff"
			},
			itemHoverStyle: {
				color: "#94a3b8"
			}
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
						color: '#fff'
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
		],
		credits: {
			enabled: false
		}
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
	// @ts-ignore
	chartPie = Highcharts.chart('chartPie', {
		chart: {
			type: 'bar',
			backgroundColor: "transparent",
			style: {
				fontFamily: 'League Mono'
			}
		},
		legend: {
			enabled: false
		},
		title: {
			text: 'By Incident Characteristic',
			align: 'center',
			style: {
				color: "#fff"
			}
		},
		xAxis: {
			labels: {
				enabled: false,
				style: {
					color: "#94a3b8"
				}
			},
			tickColor: "transparent",
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		yAxis: {
			title: "",
			labels: {
				style: {
					color: "#94a3b8"
				}
			},
			lineColor: "rgba(100,116,139,.5)",
			gridLineColor: "rgba(100,116,139,.5)"
		},
		plotOptions: {
			series: {
				dataLabels: {
					enabled: true,
					format: '{point.name}',
					style: {
						fontSize: 12 + 'px',
						color: "#FFF"
					}
				}
			}
		},
		tooltip: {
			headerFormat: '<span style="color:{point.color};font-size:13px;">{point.name}</span><br />',
			pointFormat: '<strong>{point.y}</strong> incidents'
		},
		series: [
			{
				name: 'Incident Attributes',
				colorByPoint: true,
			}
		],
		credits: {
			enabled: false
		}
	});
}

const loadPieChartData = (data: Incident[]) => {

	const attrColors = ['#9DB4C0', '#0369A1', '#022C22', '#3B0764', '#713F12', '#0E2127', '#881337', '#dc2626', '#14b8a6','#ca8a04','#171717' ];
	const attrDesc = [IncidentAttribute.AccidentalShooting, IncidentAttribute.ChildInvolvedIncident, IncidentAttribute.DefensiveUse, IncidentAttribute.HomeInvasion, IncidentAttribute.SchoolIncident, IncidentAttribute.DomesticViolence, IncidentAttribute.DrugInvolvement, IncidentAttribute.GangInvolvement, IncidentAttribute.Suicide, IncidentAttribute.MassShooting]

	const pattern = " - ";
	const accidentalMap = new Map([[`${IncidentAttribute.AccidentalShooting}|${STR_UNKNOWN}`, 0]]);
	const childMap = new Map([[`${IncidentAttribute.ChildInvolvedIncident}|${STR_UNKNOWN}`, 0]]);
	const defensiveMap = new Map([[`${IncidentAttribute.DefensiveUse}|${STR_UNKNOWN}`, 0]]);
	const homeMap = new Map([[`${IncidentAttribute.HomeInvasion}|${STR_UNKNOWN}`, 0]]);
	const schoolMap = new Map([[`${IncidentAttribute.SchoolIncident}|${STR_UNKNOWN}`, 0]]);
	const domesticMap = new Map([[`${IncidentAttribute.DomesticViolence}|${STR_UNKNOWN}`, 0]]);
	const drugMap = new Map([[`${IncidentAttribute.DrugInvolvement}|${STR_UNKNOWN}`, 0]]);
	const gangMap = new Map([[`${IncidentAttribute.GangInvolvement}|${STR_UNKNOWN}`, 0]]);
	const suicideMap = new Map([[`${IncidentAttribute.Suicide}|${STR_UNKNOWN}`, 0]]);
	const massMap = new Map([[`${IncidentAttribute.MassShooting}|${STR_UNKNOWN}`, 0]]);

	const addToMap = (attr: any, map: any, key: any, includes?: any, replace?: any) => {
		const filter = attr?.filter((a: any) => a.includes(includes ? includes : key)).map((a: any) => a.replace(replace ? replace : key, ""));
		if (filter?.length === 1) {
			map.set(`${key}|${STR_UNKNOWN}`, map.get(`${key}|${STR_UNKNOWN}`)! + 1);
		} else if (filter?.length) {
			filter.shift();
			filter?.forEach((a: any) => {
				const rep = a.replace(pattern, "").trim();
				if (!rep) {
					map.set(`${key}|${STR_UNKNOWN}`, map.get(`${key}|${STR_UNKNOWN}`)! + 1);
				} else if (map.get(`${key}|${rep}`)) {
					map.set(`${key}|${rep}`, map.get(`${key}|${rep}`)! + 1);
				} else {
					map.set(`${key}|${rep}`, 1);
				}
			})
		}
	}

	data.forEach((d: any) => {
		const attr = d.attr?.split(delimPipe);
		if (attr) {
			addToMap(attr, accidentalMap, IncidentAttribute.AccidentalShooting);
			addToMap(attr, childMap, IncidentAttribute.ChildInvolvedIncident, "Child");
			addToMap(attr, defensiveMap, IncidentAttribute.DefensiveUse);
			addToMap(attr, homeMap, IncidentAttribute.HomeInvasion);
			addToMap(attr, schoolMap, IncidentAttribute.SchoolIncident, "School", "School Shooting");
			addToMap(attr, domesticMap, IncidentAttribute.DomesticViolence);
			addToMap(attr, drugMap, IncidentAttribute.DrugInvolvement);
			addToMap(attr, gangMap, IncidentAttribute.GangInvolvement);
			addToMap(attr, suicideMap, IncidentAttribute.Suicide);
			addToMap(attr, massMap, IncidentAttribute.MassShooting);
		}
	});

	const allMaps = [accidentalMap, childMap, defensiveMap, homeMap, schoolMap, domesticMap, drugMap, gangMap, suicideMap, massMap];
	const allMapData: any = [];
	const allMapDrilldowns: any = [];

	allMaps.forEach((map: any, i: number) => {
		const key = attrDesc[i];
		const drilldowns: any = {
			name: key,
			id: key,
			data: []
		}
		let total = 0;
		const drilldownData = Array.from(map).map((m: any) => {
			total = total + m[1];
			return [m[0].split("|")[1], m[1]]
		});
		drilldowns["data"] = drilldownData;
		// console.log(total, data.length);
		allMapData.push({
			name: key,
			drilldown: key,
			color: attrColors[i], 
			y: total
		});
		allMapDrilldowns.push(drilldowns);
	})

	chartPie.series[0].setData(allMapData);

	// console.log(chartPie.setDrilldown({

	// }))
	// allMapDrilldowns.forEach((d: any) => {
	// 	chartPie.drilldown.series[0].setData(d);
	// })
	
}

const updateDataViews = (data: Incident[], title: string) => {
	loadBarChartData(data);
	loadTimeChartData(data);
	loadBubbleChartData(data);
	loadPieChartData(data);
	updateIncidentTotal(data.length, title);
}