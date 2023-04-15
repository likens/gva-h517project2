import './style.css'
import { Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, HorizontalOrigin, VerticalOrigin, Ray, JulianDate, Cartesian3, ConstantProperty, HeightReference } from 'cesium'
import { Incident, STR_FEMALE, STR_MALE, STR_ADULT, STR_CHILD, STR_TEEN, findStateByCode } from "./utils";

const globalAlpha = 1;
const highlightColor = Color.RED.withAlpha(globalAlpha);

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

let genderMap = new Map([[STR_FEMALE, 0],[STR_MALE, 0]]);
let ageGroupsMap = new Map([[STR_ADULT, 0],[STR_TEEN, 0],[STR_CHILD, 0]]);
let agesMap = new Map();
let attributesMap = new Map();


Promise.all([fetch('gva_data.json').then(r => r.json())]).then(data => {
	
	setupDataMaps(data[0]);
	setupInitCamera();
	setupTooltip();	
	setupDataSource("us_st.json");
	
	const setupDataSourceButtons = (buttons: HTMLButtonElement[]) => {
		buttons.forEach(btn => btn.addEventListener('click', () => setupDataSource(btn.dataset.source as any)));
	}
	
	setupDataSourceButtons(Array.from(document.querySelectorAll<HTMLButtonElement>('#toolbar button')))

})

const setupDataMaps = (data: any) => {

	const delimPipe = "||";
	const delimColon = "::";

	data.forEach((d: Incident) => {
		
		// if (d.cty === "Fort Wayne") {

			// console.log(d);

			if (d.genders) {
				d.genders.split(delimPipe).forEach(g => {
					if (g.includes(STR_FEMALE)) {
						let num = genderMap.get(STR_FEMALE);
						genderMap.set(STR_FEMALE, num! + 1);
					} else {
						let num = genderMap.get(STR_MALE);
						genderMap.set(STR_MALE, num! + 1);
					}
				})
			}

			if (d.agroups) {
				d.agroups.split(delimPipe).forEach(a => {
					if (a.includes(STR_ADULT)) {
						let num = ageGroupsMap.get(STR_ADULT);
						ageGroupsMap.set(STR_ADULT, num! + 1);
					} else if (a.includes(STR_TEEN)) {
						let num = ageGroupsMap.get(STR_TEEN);
						ageGroupsMap.set(STR_TEEN, num! + 1);
					} else if (a.includes(STR_CHILD)) {
						let num = ageGroupsMap.get(STR_CHILD);
						ageGroupsMap.set(STR_CHILD, num! + 1);
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

		// }

		let state = d.st ? d.st : "NOSTATE";
		let county = d.cny ? formatCounty(d.cny) : "NOCOUNTY";
		let cd = d.cd?.length < 2 ? `0${d.cd}` : d.cd ? d.cd : "NOCD";
		let city = d.cty ? d.cty : "NOCITY";

		// if (!state) { console.log("NO STATE FOUND", d)} 
		// if (!county) { console.log("NO COUNTY FOUND", d)}
		// if (!cd) { console.log("NO CD FOUND", d)}
		// if (!city) { console.log("NO CITY FOUND", d)}
		
		addToGeoMap(state, US_ST_MAP);
		addToGeoMap(`${county}_${state}`, US_CNY_MAP);
		addToGeoMap(`${cd}_${state}`, US_CD_MAP);
		addToGeoMap(`${city}_${county}_${state}`, US_CTY_MAP, {location: `${d.lng},${d.lat}`});






	})

	US_ST_MAP = new Map(Array.from(US_ST_MAP.entries()).sort());
	US_CNY_MAP = new Map(Array.from(US_CNY_MAP.entries()).sort());
	US_CD_MAP = new Map(Array.from(US_CD_MAP.entries()).sort());
	US_CTY_MAP = new Map(Array.from(US_CTY_MAP.entries()).sort());

	console.log(US_ST_MAP);
	console.log(US_CNY_MAP);
	console.log(US_CD_MAP);
	console.log(US_CTY_MAP);

	agesMap = new Map(Array.from(agesMap.entries()).sort());
	attributesMap = new Map(Array.from(attributesMap.entries()).sort());

	console.log(genderMap);
	console.log(ageGroupsMap);
	console.log(agesMap);
	console.log(attributesMap);
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
		obj.incidents = obj.incidents + 1;
		map.set(key, obj);
	} else {
		const obj = {
			incidents: 1,
			color: Color.fromRandom({alpha: globalAlpha}),
			...optionals
		}
		map.set(key, obj);
	}
}

const setupInitCamera = () => {
	camera.flyTo({
		destination: new Cartesian3(-1053594.94012635, -8153616.159871477, 6250954.07672872),
		orientation: {
			heading: 6.283185307179583,
			pitch: -1.5691840981764815,
			roll: 0
		},
		duration: 1
	})
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
	const tooltip: any = viewer.entities.getById('tooltip');
	const cartesian = scene.pickPosition(movement.endPosition);
	const pick = scene.pick(movement.endPosition);
	const pickedObject: Entity = scene.pick(movement.endPosition)?.id;

	if (defined(pickedObject)) {
		const props = pickedObject.properties?.getValue(JulianDate.now());
		if (props?.COUNTY) {
			highlightedEntities = cnyEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.CD) {
			highlightedEntities = cdEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.STATE) {
			highlightedEntities = stEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		}
	} else{
		highlightedEntities = [];
	}

	if (cartesian) {
		if (pick?.id) {
			const ray: Ray | undefined = viewer.camera.getPickRay(movement.endPosition);
			tooltip.position = cartesian ? cartesian : scene.globe.pick(ray ? ray : new Ray(), scene);
			tooltip.label.show = true;
			tooltip.label.font = "20px sans-serif";
			if (pick.id.properties) {
				const props = pick.id.properties;
				const state = findStateByCode(props.STATE.getValue());
				if (props.COUNTY) {
					const key = `${props.NAME.getValue()}_${state?.abbr}`;
					const incidents = US_CNY_MAP.get(key)?.incidents;
					const title = `${props.NAME.getValue()} ${props.LSAD.getValue()}, ${state?.abbr}`
					if (!incidents) {
						tooltip.label.text = `${title} - 0 incidents`;
					} else {
						tooltip.label.text = `${title} - ${incidents} incidents`;
					}
				} else if (props.CD) {
					const key = `${props.CD.getValue()}_${state?.abbr}`;
					const incidents = US_CD_MAP.get(key)?.incidents;
					const title = `District ${props.CD.getValue()}, ${state?.abbr}`
					if (!incidents) {
						tooltip.label.text = `${title} - 0 incidents`;
					} else {
						tooltip.label.text = `${title} - ${incidents} incidents`;
					}
				} else {
					tooltip.label.text = `${props.NAME.getValue()} - ${US_ST_MAP.get(state?.abbr).incidents} incidents`;
				}
			} else if (pick.id.name) {
				tooltip.label.text = pick.id.name;
			}
		}
		else {
			tooltip.label.show = false;
		}

	} else {
		tooltip.label.show = false;
	}

}, ScreenSpaceEventType.MOUSE_MOVE);

const setupTooltip = () => {
	viewer.entities.add({
		id: 'tooltip',
		label: {
			disableDepthTestDistance: Number.POSITIVE_INFINITY,
			fillColor: Color.WHITE,
			showBackground: true,
			backgroundColor: Color.BLACK.withAlpha(0.75),
			horizontalOrigin: HorizontalOrigin.LEFT,
			verticalOrigin: VerticalOrigin.CENTER,
			pixelOffset: new Cartesian2(15, 30)
		}
	});
}

const setupDataSource = (dataSource: string) => {

	viewer.dataSources.removeAll();
	// viewer.entities.removeAll();

	if (dataSource) {
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
							let color = Color.WHITE.withAlpha(globalAlpha);
							let multiplier = 50;
							const abbr = findStateByCode(entity.properties.STATE.getValue())?.abbr;
							if (entity.properties.COUNTY) {
								const county = US_CNY_MAP.get(`${entity.properties.NAME.getValue()}_${abbr}`);
								if (county) {
									incidents = county.incidents;
									color = county.color;
								}
							} else if (entity.properties.CD) {
								const cd = US_CD_MAP.get(`${entity.properties.CD.getValue()}_${abbr}`);
								if (cd) {
									incidents = cd.incidents;
									color = cd.color;
								}
							} else if (entity.properties.STATE) {
								const state = US_ST_MAP.get(abbr);
								if (state) {
									incidents = state.incidents;
									color = state.color;
									multiplier = 30;
								}
							}
							entity.polygon.material = updateMaterial(entity, color);
							entity.polygon.outline = new ConstantProperty(false);
							entity.polygon.extrudedHeight = new ConstantProperty(incidents ? incidents * multiplier : undefined);
						}
					}
				}
			}
		})
	} else {
		US_CTY_MAP.forEach((city, key) => {
			const name = key.split("_");
			const location = city.location.split(",");
			const incidents = city.incidents;
			const scale = incidents / 200;
			viewer.entities.add({
				name: `${name[0]}, ${name[2]} - ${incidents} incidents`,
				position: Cartesian3.fromDegrees(Number(location[0]), Number(location[1]), 0),
				point: {
					pixelSize: (scale) < 2 ? 2 : scale,
					color: Color.YELLOW
				},
				ellipse: {
					semiMinorAxis: 2000,
					semiMajorAxis: 2000,
					heightReference: HeightReference.RELATIVE_TO_GROUND,
					material: Color.YELLOW.withAlpha(globalAlpha),
					height: 0,
					extrudedHeight: incidents * 50
				},
			})
		})
	}

}