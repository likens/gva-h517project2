import './style.css'
import { Math as CesiumMath, Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, JulianDate, Cartesian3, BoundingSphere, HeadingPitchRange } from 'cesium'
import { Incident, STR_FEMALE, STR_MALE, STR_ADULT, STR_CHILD, STR_TEEN, findStateByCode, US_STATES_DICT, HOME_CAMERA, findStateByAbbr } from "./utils";

const globalAlpha = .5;
const highlightColor = Color.RED.withAlpha(globalAlpha);

const delimPipe = "||";
// const delimColon = "::";

let mapView = "USA";
let mapActiveState = "";
let mapActiveCounty = "";

let highlightedEntities: any[] = [];
let cdEntities: any[] = [];
let cnyEntities: any[] = [];
let stEntities: any[] = [];
let ctyEntities: any[] = [];
// let coordEntities: any[] = [];

let statesMap = new Map();
let countiesMap = new Map();
let cdMap = new Map();
let citiesMap = new Map();
let coordsMap = new Map();

const viewer = new Viewer("cesium");
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

Promise.all([fetch('gva_data.json').then(r => r.json())]).then(data => {
	usaNav?.addEventListener('click', () => {

		if (mapView !== "USA") {
			console.log("show country");

			mapView = "USA";
			mapActiveState = "";
			mapActiveCounty = "";

			stEntities.forEach((entity: any) => {
				entity.show = true;
				entity.polygon.material = updateMaterial(entity, Color.WHITE.withAlpha(globalAlpha));
			})
			cnyEntities.forEach((entity: any) => {
				entity.show = false;
				entity.polygon.material = updateMaterial(entity, Color.WHITE.withAlpha(globalAlpha));
			})

			camera.flyTo(HOME_CAMERA);
			stateNav.innerHTML = "";
			countyNav.innerHTML = "";
		}
	})
	
	stateNav?.addEventListener('click', () => {
		if (mapView !== "ST") {
			console.log("show state");

			mapView = "ST";
			mapActiveCounty = "";
			
			stEntities.forEach((entity: any) => {
				if (findStateByCode(entity.properties.STATE.getValue())!.name === mapActiveState) {
					entity.show = true;
					const hierarchy = entity.polygon.hierarchy.getValue();
					const boundingSphere = BoundingSphere.fromPoints(hierarchy.positions);
					camera.flyToBoundingSphere(boundingSphere, {
						duration: 1,
						offset: new HeadingPitchRange(0, CesiumMath.toRadians(-90), boundingSphere.radius * 2.35),
					});
					entity.polygon.material = Color.TRANSPARENT;
				} else {
					entity.show = false;
				}
			})
			cnyEntities.forEach((entity: any) => {
				if (findStateByCode(entity.properties.STATE.getValue())!.name === mapActiveState) {
					entity.show = true;
					entity.polygon.material = updateMaterial(entity, Color.WHITE.withAlpha(globalAlpha));
				} else {
					entity.show = false;
				}
			})

			countyNav.innerHTML = "";

		}
	})
	countyNav?.addEventListener('click', () => {
		
	})
	setupDataMaps(data[0]);
	setupInitCamera();
	setupDataSources();
})

const setupDataMaps = (data: any) => {

	console.log(data.length);

	data.forEach((d: Incident) => {

		setupAllData(d)

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

	})

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

	console.log(dataMap);
}

const setupAllData = (incident: Incident) => {

	let key = incident.st;

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

const formatCounty = (cny: string) => {
	return cny.replace(" County", "")
		.replace(" Parish", "")
		.replace(" Borough", "")
		.replace(" CA", "")
		.replace(" Census Area", "")
		.replace(" City", "");
}

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
	viewer.homeButton.viewModel.command.beforeExecute.addEventListener((info) => {
		info.cancel = true;
		viewer.camera.flyTo(HOME_CAMERA);
	});

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
				tooltipText = `
					${props.NAME} - ${statesMap.get(state?.abbr)?.incidents._count} incidents
					<br/>
					${statesMap.get(state?.abbr)?.incidents._killed} killed
					<br />
					${statesMap.get(state?.abbr)?.incidents._injured} injured`;
			}
		} else {
			if (!pickedObject.INCIDENTS) {
				tooltipText = `${pickedObject.name} - 0 incidents`;
			} else {
				tooltipText= `${pickedObject.name}, ${pickedObject.STATE} - ${pickedObject.INCIDENTS} incidents`;
			}
		}
		htmlTooltip.innerHTML = tooltipText;
		htmlTooltip.style.transform = `translate(${xPosition + 25}px, ${yPosition + 25}px)`;
		htmlTooltip.classList.add('block');
		htmlTooltip.classList.remove('hidden');
	} else {
		hideTooltip();
	}

}, ScreenSpaceEventType.MOUSE_MOVE);





























handler.setInputAction((movement: { position: Cartesian2; }) => {

	const pickedEntity: any = scene.pick(movement.position);

	if (defined(pickedEntity)) {

		const props = pickedEntity.id.properties;
		const entityName = props.NAME.getValue();
		const dataObj = dataMap.get(findStateByCode(props.STATE.getValue())?.abbr);
		mapView = props.TYPE.getValue();

		if (props.TYPE.getValue() === "ST") {
			stateNav.innerHTML = entityName;
			mapActiveState = entityName;
			stEntities.forEach((entity: any) => {
				if (entity.name !== pickedEntity.id.name) {
					entity.show = false;
				} else {
					pickedEntity.id.polygon.material = Color.TRANSPARENT;
					cnyEntities.forEach((entity: any) => {
						if (findStateByCode(entity.properties.STATE.getValue())!.abbr === dataObj.state.abbr) {
							entity.show = true;
						}
					})
				}
			})
		} else if (props.TYPE.getValue() === "CNY") {
			countyNav.innerHTML = `${entityName}${props.LSAD.getValue() ? ` ${props.LSAD.getValue()}` : ``}`;
			const code = findStateByAbbr(dataObj.state.abbr)!.code;
			cnyEntities.forEach((entity: any) => {
				const props = entity.properties;
				if (entityName !== props.NAME.getValue() || code !== props.STATE.getValue()) {
					entity.show = false;
				} else {
					pickedEntity.id.polygon.material = Color.WHITE.withAlpha(globalAlpha);
					// coordEntities
					ctyEntities.forEach((entity: any) => {
						if (formatCounty(entity.COUNTY) === entityName && entity.STATE === dataObj.state.abbr) {
							entity.show = true;
						}
					})
				}
			})
		}

		const hierarchy = pickedEntity.id.polygon.hierarchy.getValue();
		const boundingSphere = BoundingSphere.fromPoints(hierarchy.positions);
		camera.flyToBoundingSphere(boundingSphere, {
			duration: 1,
			offset: new HeadingPitchRange(0, CesiumMath.toRadians(-90), boundingSphere.radius * 5),
		});
	}

}, ScreenSpaceEventType.LEFT_CLICK);



































const setupDataSources = () => {

	GeoJsonDataSource.load("us_st.json").then((source) => {
		viewer.dataSources.add(source);
		stEntities = source.entities.values;
		for (var i = 0; i < stEntities.length; i++) {
			stEntities[i].polygon.material = updateMaterial(stEntities[i], Color.WHITE.withAlpha(globalAlpha));
			stEntities[i].polygon.outline = true;
			stEntities[i].polygon.outlineColor = Color.BLACK
		}
	})

	GeoJsonDataSource.load("us_cd.json").then((source) => {
		viewer.dataSources.add(source);
		cdEntities = source.entities.values;
		for (var i = 0; i < cdEntities.length; i++) {
			cdEntities[i].show = false;
			cdEntities[i].polygon.material = updateMaterial(cdEntities[i], Color.WHITE.withAlpha(globalAlpha));
			cdEntities[i].polygon.outline = true;
			cdEntities[i].polygon.outlineColor = Color.BLACK
		}
	})

	GeoJsonDataSource.load("us_cny.json").then((source) => {
		viewer.dataSources.add(source);
		cnyEntities = source.entities.values;
		for (var i = 0; i < cnyEntities.length; i++) {
			cnyEntities[i].show = false;
			cnyEntities[i].polygon.material = updateMaterial(cnyEntities[i], Color.WHITE.withAlpha(globalAlpha));
			cnyEntities[i].polygon.outline = true;
			cnyEntities[i].polygon.outlineColor = Color.BLACK
		}
	})

		// citiesMap.forEach((city, key) => {
		// 	const name = key.split("_");
		// 	const location = city.location.split(",");
		// 	const incidents = city.incidents._count;
		// 	const entity: any = viewer.entities.add({
		// 		show: false,
		// 		name: name[0],
		// 		position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
		// 		point: {
		// 			pixelSize: 10,
		// 			color: Color.YELLOW
		// 		},
		// 		// ellipse: {
		// 		// 	semiMinorAxis: 2000,
		// 		// 	semiMajorAxis: 2000,
		// 		// 	heightReference: HeightReference.RELATIVE_TO_GROUND,
		// 		// 	material: Color.WHITE.withAlpha(globalAlpha),
		// 		// 	height: 0,
		// 		// 	extrudedHeight: incidents * 50
		// 		// },
		// 	});
		// 	entity.addProperty("STATE");
		// 	entity.addProperty("COUNTY");
		// 	entity.addProperty("CITY");
		// 	entity.STATE = name[2];
		// 	entity.COUNTY = name[1];
		// 	entity.CITY = name[0];
		// 	entity.INCIDENTS = incidents;
		// 	ctyEntities.push(entity);
		// })

		// coordsMap.forEach((coord, key) => {
		// 	const name = key.split("_");
		// 	const location = coord.location.split(",");
		// 	const incidents = coord.incidents._count;
		// 	const entity: any = viewer.entities.add({
		// 		show: false,
		// 		name: coord.location,
		// 		position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
		// 		point: {
		// 			pixelSize: 5,
		// 			color: Color.YELLOW
		// 		},
		// 	})
		// 	entity.addProperty("STATE");
		// 	entity.addProperty("COUNTY");
		// 	entity.addProperty("CITY");
		// 	entity.STATE = name[2];
		// 	entity.COUNTY = name[1];
		// 	entity.CITY = name[0];
		// 	entity.INCIDENTS = incidents;
		// 	coordEntities.push(entity);
		// })

		// console.log(coordEntities);
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
