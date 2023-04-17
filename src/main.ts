import './style.css'
import { Math as CesiumMath, Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, JulianDate, Cartesian3, HeightReference, BoundingSphere, HeadingPitchRange } from 'cesium'
import { Incident, STR_FEMALE, STR_MALE, STR_ADULT, STR_CHILD, STR_TEEN, findStateByCode, US_STATES_DICT, findStateByName } from "./utils";

const globalAlpha = .25;
const highlightColor = Color.RED.withAlpha(globalAlpha);

const delimPipe = "||";
const delimColon = "::";

let highlightedEntities: any[] = [];
let cdEntities: any[] = [];
let cnyEntities: any[] = [];
let stEntities: any[] = [];

const viewer = new Viewer("cesium");
const scene = viewer.scene;
const camera = viewer.camera;
const handler = viewer.screenSpaceEventHandler;

let US_ST_MAP = new Map();
let US_CNY_MAP = new Map();
let US_CD_MAP = new Map();
let US_CTY_MAP = new Map();
let US_ALL_MAP = new Map();

let genderMap = new Map([[STR_FEMALE, 0],[STR_MALE, 0]]);
let ageGroupsMap = new Map([[STR_ADULT, 0],[STR_TEEN, 0],[STR_CHILD, 0]]);
let agesMap = new Map();
let attributesMap = new Map();

let htmlTooltip = document.getElementById("tooltip")!;

const dataMap = new Map();

Promise.all([fetch('gva_data.json').then(r => r.json())]).then(data => {
	
	setupDataMaps(data[0]);
	setupInitCamera();
	setupDataSource("us_st.json");
	
	const setupDataSourceButtons = (buttons: HTMLButtonElement[]) => {
		buttons.forEach(btn => btn.addEventListener('click', () => setupDataSource(btn.dataset.source as any)));
	}
	
	setupDataSourceButtons(Array.from(document.querySelectorAll<HTMLButtonElement>('#geo button')))

})

const setupDataMaps = (data: any) => {

	console.log(data.length);

	data.forEach((d: Incident) => {

		setupAllData(d)

		let state = d.st ? d.st : "NOSTATE";
		let county = d.cny ? formatCounty(d.cny) : "NOCOUNTY";
		let cd = d.cd?.length < 2 ? `0${d.cd}` : d.cd ? d.cd : "NOCD";
		let city = d.cty ? d.cty : "NOCITY";
		let lng = d.lng;
		let lat = d.lat;

		// if (!state) { console.log("NO STATE FOUND", d)} 
		// if (!county) { console.log("NO COUNTY FOUND", d)}
		// if (!cd) { console.log("NO CD FOUND", d)}
		// if (!city) { console.log("NO CITY FOUND", d)}
		
		addToGeoMap(state, US_ST_MAP);
		addToGeoMap(`${county}_${state}`, US_CNY_MAP);
		addToGeoMap(`${cd}_${state}`, US_CD_MAP);
		addToGeoMap(`${city}_${county}_${state}`, US_CTY_MAP, {location: `${lng},${lat}`});
		addToGeoMap(`${lng},${lat}`, US_ALL_MAP, {location: `${lng},${lat}`});

		const updateGeoGender = (key: string, type: string, map: any) => {
			map.get(key).incidents.gender[type] = map.get(key).incidents.gender[type] + 1;
		}
		const updateGeoAgeGroup = (key: string, type: string, map: any) => {
			map.get(key).incidents.ageGroup[type] = map.get(key).incidents.ageGroup[type] + 1;
		}
		const updateGeoKilled = (key: string, map: any) => {
			map.get(key).incidents._killed = map.get(key).incidents._killed + 1;
		}
		const updateGeoInjured = (key: string, map: any) => {
			map.get(key).incidents._injured = map.get(key).incidents._injured + 1;
		}

		if (Number(d.nkill) > 0) {
			updateGeoKilled(state, US_ST_MAP);
		}

		if (Number(d.ninj) > 0) {
			updateGeoInjured(state, US_ST_MAP);
		}

		if (d.genders) {
			d.genders.split(delimPipe).forEach(g => {
				if (g.includes(STR_FEMALE)) {
					genderMap.set(STR_FEMALE, genderMap.get(STR_FEMALE)! + 1);
					updateGeoGender(state, STR_FEMALE, US_ST_MAP);
				} else {
					genderMap.set(STR_MALE, genderMap.get(STR_MALE)! + 1);
					updateGeoGender(state, STR_MALE, US_ST_MAP);
				}
			})
		}

		if (d.agroups) {
			d.agroups.split(delimPipe).forEach(a => {
				if (a.includes(STR_ADULT)) {
					ageGroupsMap.set(STR_ADULT, ageGroupsMap.get(STR_ADULT)! + 1);
					updateGeoAgeGroup(state, STR_ADULT, US_ST_MAP);
				} else if (a.includes(STR_TEEN)) {
					ageGroupsMap.set(STR_TEEN, ageGroupsMap.get(STR_TEEN)! + 1);
					updateGeoAgeGroup(state, STR_TEEN, US_ST_MAP);
				} else if (a.includes(STR_CHILD)) {
					ageGroupsMap.set(STR_CHILD, ageGroupsMap.get(STR_CHILD)! + 1);
					updateGeoAgeGroup(state, STR_CHILD, US_ST_MAP);
				}
			})
		}

		if (d.ages) {
			d.ages.split(delimPipe).forEach(a => {
				let age = a.slice(a.indexOf(delimColon) + 2);
				age.length === 1 ? age = `0${age}` : undefined;
				if (agesMap.has(age)) {
					agesMap.set(age, agesMap.get(age) + 1);
				} else {
					agesMap.set(age, 1);
				}
			})
		}

		if (d.attr) {
			d.attr.split(delimPipe).forEach(attr => {
				if (attributesMap.has(attr)) {
					attributesMap.set(attr, attributesMap.get(attr) + 1);
				} else {
					attributesMap.set(attr, 1);
				}
			})
		}

	})

	const color1 = {r: 247, g: 89, b: 48};
	const color2 = {r: 255, g: 243, b: 240};
	// const color1 = {r: 89, g: 38, b: 77};
	// const color2 = {r: 251, g: 248, b: 251};

	let counter = 0;
	const stColors = generateColorScale(US_ST_MAP.size, color1, color2);
	US_ST_MAP = new Map(Array.from(US_ST_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	US_ST_MAP.forEach((value: any, key: any, map: any) => {
		const obj = {
			...value,
			color: Color.fromCssColorString(stColors[counter])
		}
		map.set(key, obj);
		counter++;
	});
	counter = 0;
	const cnyColors = generateColorScale(US_CNY_MAP.size, color1, color2);
	US_CNY_MAP = new Map(Array.from(US_CNY_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	US_CNY_MAP.forEach((value: any, key: any, map: any) => {
		const obj = {
			...value,
			color: Color.fromCssColorString(cnyColors[counter])
		}
		map.set(key, obj);
		counter++;
	});
	counter = 0;
	const cdColors = generateColorScale(US_CD_MAP.size, color1, color2);
	US_CD_MAP = new Map(Array.from(US_CD_MAP).sort((a, b) => b[1].incidents.count - a[1].incidents.count));
	US_CD_MAP.forEach((value: any, key: any, map: any) => {
		const obj = {
			...value,
			color: Color.fromCssColorString(cdColors[counter])
		}
		map.set(key, obj);
		counter++;
	});
	
	US_CTY_MAP = new Map(Array.from(US_CTY_MAP.entries()).sort());
	US_ALL_MAP = new Map(Array.from(US_ALL_MAP.entries()).sort());

	// console.log(US_ST_MAP);
	// console.log(US_CNY_MAP);
	// console.log(US_CD_MAP);
	// console.log(US_CTY_MAP);
	// console.log(US_ALL_MAP);

	agesMap = new Map(Array.from(agesMap.entries()).sort());
	attributesMap = new Map(Array.from(attributesMap.entries()).sort());

	// console.log(genderMap);
	// console.log(ageGroupsMap);
	// console.log(agesMap);
	console.log(attributesMap);

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
					counties: new Map(),
					districts: new Map(),
					cities: new Map()
				}
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

		if (incident.cny) {
			const cny = incident.cny;
			dataMap.get(key).state.counties.set(cny, 1);
		}

		if (incident.cd) {
			const cd = incident.cd?.length < 2 ? `0${incident.cd}` : incident.cd;
			dataMap.get(key).state.districts.set(cd, 1);
		}

		if (incident.cty) {
			const city = `${incident.cty}_${incident.cny ? incident.cny : "NOCOUNTY"}`;
			dataMap.get(key).state.cities.set(city, 1);
		}

	}

}

const generateColorScale = (num: number, color1: any, color2: any) => {
	const colors = [];
	for (let i = 0; i < num; i++) {
		const percent = i / (num - 1);
		const r = Math.round(color1.r * (1 - percent) + color2.r * percent);
		const g = Math.round(color1.g * (1 - percent) + color2.g * percent);
		const b = Math.round(color1.b * (1 - percent) + color2.b * percent);
		const hex = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
		colors.push(hex);
	}
	return colors;
}

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
	const homeCamera = {
		destination: new Cartesian3(-1053594.94012635, -8153616.159871477, 6250954.07672872),
		orientation: {
			heading: 6.283185307179583,
			pitch: -1.5691840981764815,
			roll: 0
		},
		duration: 1
	}
	camera.flyTo(homeCamera);
	viewer.homeButton.viewModel.command.beforeExecute.addEventListener((info) => {
		info.cancel = true;
		viewer.camera.flyTo(homeCamera);
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
	const pickedObject: Entity = scene.pick(movement.endPosition)?.id;

	const xPosition = movement.endPosition.x;
	const yPosition = movement.endPosition.y;

	const hideTooltip = () => {
		htmlTooltip.classList.add('hidden');
		htmlTooltip.classList.remove('block');
		highlightedEntities = [];
	}

	if (defined(pickedObject)) {
		const props = pickedObject.properties?.getValue(JulianDate.now());
		if (props?.COUNTY) {
			highlightedEntities = cnyEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.CD) {
			highlightedEntities = cdEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.STATE) {
			highlightedEntities = stEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		}
		let tooltipText = "";
		const state = findStateByCode(props.STATE);
		if (props.COUNTY) {
			const key = `${props.NAME}_${state?.abbr}`;
			const incidents = US_CNY_MAP.get(key)?.incidents._count;
			const title = `${props.NAME} ${props.LSAD}, ${state?.abbr}`
			if (!incidents) {
				tooltipText = `${title} - 0 incidents`;
			} else {
				tooltipText= `${title} - ${incidents} incidents`;
			}
		} else if (props.CD) {
			const key = `${props.CD}_${state?.abbr}`;
			const incidents = US_CD_MAP.get(key)?.incidents._count;
			const title = `District ${props.CD}, ${state?.abbr}`
			if (!incidents) {
				tooltipText = `${title} - 0 incidents`;
			} else {
				tooltipText = `${title} - ${incidents} incidents`;
			}
		} else if (state) {
			tooltipText = `
				${props.NAME} - ${US_ST_MAP.get(state?.abbr).incidents._count} incidents
				<br/>
				${US_ST_MAP.get(state?.abbr).incidents._killed} killed
				<br />
				${US_ST_MAP.get(state?.abbr).incidents._injured} injured`;
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

	const pickedObject: any = scene.pick(movement.position);

	if (defined(pickedObject)) {

		const state = dataMap.get(findStateByName(pickedObject.id.name)?.abbr);
		console.log(state);

		const hierarchy = pickedObject.id.polygon.hierarchy.getValue();
		const boundingSphere = BoundingSphere.fromPoints(hierarchy.positions);
		camera.flyToBoundingSphere(boundingSphere, {
			duration: 1,
			offset: new HeadingPitchRange(0, CesiumMath.toRadians(-90), boundingSphere.radius * 2),
		});
	}

}, ScreenSpaceEventType.LEFT_CLICK);

// const setupTooltip = () => {
// 	viewer.entities.add({
// 		id: 'tooltip',
// 		label: {
// 			disableDepthTestDistance: Number.POSITIVE_INFINITY,
// 			fillColor: Color.WHITE,
// 			showBackground: true,
// 			backgroundColor: Color.BLACK.withAlpha(0.75),
// 			horizontalOrigin: HorizontalOrigin.LEFT,
// 			verticalOrigin: VerticalOrigin.CENTER,
// 			pixelOffset: new Cartesian2(15, 30)
// 		}
// 	});
// }

const setupDataSource = (dataSource: string) => {

	viewer.dataSources.removeAll();
	viewer.entities.removeAll();

	if (dataSource?.includes("json")) {
		const loadSource = GeoJsonDataSource.load(dataSource);
		loadSource.then((source) => {
			viewer.dataSources.add(source);
			let entities: any[] = [];
			switch (dataSource) {
				case "us_cd.json":
					cdEntities = source.entities.values;
					entities = cdEntities;
					break;
				case "us_cny.json":
					cnyEntities = source.entities.values;
					entities = cnyEntities;
					break;
				case "us_st.json":
					stEntities = source.entities.values;
					entities = stEntities;
					break;
			}
			for (var i = 0; i < entities.length; i++) {
				const entity: Entity = entities[i];
				if (entity) {
					if (entity?.properties?.GEO_ID.getValue()) {
						if (entity.polygon) {
							let incidents = 0;
							let color = Color.YELLOW.withAlpha(globalAlpha);
							// let multiplier = 50;
							const abbr = findStateByCode(entity.properties.STATE.getValue())?.abbr;
							if (entity.properties.COUNTY) {
								const county = US_CNY_MAP.get(`${entity.properties.NAME.getValue()}_${abbr}`);
								if (county) {
									incidents = county.incidents._count;
									// color = county.color;
								}
								
							} else if (entity.properties.CD) {
								const cd = US_CD_MAP.get(`${entity.properties.CD.getValue()}_${abbr}`);
								if (cd) {
									incidents = cd.incidents._count;
									// color = cd.color;
								}
							} else if (entity.properties.STATE) {
								const state = US_ST_MAP.get(abbr);
								if (state) {
									incidents = state.incidents._count;
									// color = state.color;
									// multiplier = 30;
								}
							}
							entity.polygon.material = updateMaterial(entity, color);
							// entity.polygon.outline = new ConstantProperty(false);
							// entity.polygon.extrudedHeight = new ConstantProperty(incidents ? incidents * multiplier : undefined);
						}
					}
				}
			}
		})
	} else {
		if (dataSource) {
			US_CTY_MAP.forEach((city, key) => {
				const name = key.split("_");
				const location = city.location.split(",");
				const incidents = city.incidents._count;
				const scale = incidents / 200;
				viewer.entities.add({
					name: `${name[0]}, ${name[2]} - ${incidents} incidents`,
					position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
					point: {
						pixelSize: (scale) < 2 ? 2 : scale,
						color: Color.WHITE
					},
					ellipse: {
						semiMinorAxis: 2000,
						semiMajorAxis: 2000,
						heightReference: HeightReference.RELATIVE_TO_GROUND,
						material: Color.WHITE.withAlpha(globalAlpha),
						height: 0,
						extrudedHeight: incidents * 50
					},
				})
			})
		} else {
			US_ALL_MAP.forEach((city, key) => {
				const name = key.split("_");
				const location = city.location.split(",");
				const incidents = city.incidents._count;
				const scale = incidents / 2;
				viewer.entities.add({
					name: `${name[0]}, ${name[2]} - ${incidents} incidents`,
					position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
					point: {
						pixelSize: (scale) < 2 ? 4 : scale,
						color: Color.WHITE
					},
				})
			})
		}
	}

}