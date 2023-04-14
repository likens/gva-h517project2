import './style.css'
import { Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, HorizontalOrigin, VerticalOrigin, Ray, JulianDate, Cartesian3, ConstantProperty, HeightReference } from 'cesium'
import { Incident, findStateByCode } from "./utils";

const highlightColor = Color.RED.withAlpha(1);

const baseStyle = {
	stroke: Color.BLACK.withAlpha(.2),
	fill: Color.WHITE.withAlpha(.2)
}

const usCongressionalGeoJson = "us_congressional.json";
const usCountiesGeoJson = "us_counties.json";
const usStatesGeoJson = "us_states.json";

let highlightedEntities: any[] = [];
let congressionalEntities: any[] = [];
let countyEntities: any[] = [];
let stateEntities: any[] = [];

const viewer = new Viewer("cesium");
const scene = viewer.scene;
const camera = viewer.camera;
const handler = viewer.screenSpaceEventHandler;

let US_STATES_MAP = new Map();
let US_COUNTIES_MAP = new Map();
let US_CD_MAP = new Map();
let US_CITY_MAP = new Map();

Promise.all([fetch('gva_data.json').then(r => r.json())]).then(data => {
	
	setupDataMaps(data[0]);
	setupInitCamera();
	setupTooltip();	
	setupDataSource(usStatesGeoJson);
	
	const setupDataSourceButtons = (buttons: HTMLButtonElement[]) => {
		buttons.forEach(btn => btn.addEventListener('click', () => setupDataSource(btn.dataset.source as any)));
	}
	
	setupDataSourceButtons(Array.from(document.querySelectorAll<HTMLButtonElement>('#toolbar button')))

})

const setupDataMaps = (data: any) => {

	data.forEach((d: Incident) => {
		
		if (d.st) {
			const state = d.st;
			if (US_STATES_MAP.has(state)) {
				const obj = US_STATES_MAP.get(state);
				obj.incidents = obj.incidents + 1;
				US_STATES_MAP.set(state, obj);
			} else {
				const obj = {
					incidents: 1,
					color: Color.fromRandom({alpha: 1.0})
				}
				US_STATES_MAP.set(state, obj);
			}
		}
		if (d.cny) {
			const state = d.st;
			const county = d.cny.replace(" County", "")
								.replace(" Parish", "");
			const key = `${county}_${state}`;
			if (US_COUNTIES_MAP.has(key)) {
				const obj = US_COUNTIES_MAP.get(key);
				obj.incidents = obj.incidents + 1;
				US_COUNTIES_MAP.set(key, obj);
			} else {
				const obj = {
					incidents: 1,
					color: Color.fromRandom({alpha: 1.0})
				}
				US_COUNTIES_MAP.set(key, obj);
			}
		}
		if (d.cd) {
			const state = d.st ? d.st : "NOSTATE";
			let cd = d.cd;
			if (cd.length < 2) {
				cd = `0${cd}`;
			}
			const key = `${cd}_${state}`;
			if (US_CD_MAP.has(key)) {
				const obj = US_CD_MAP.get(key);
				obj.incidents = obj.incidents + 1;
				US_CD_MAP.set(key, obj);
			} else {
				const obj = {
					incidents: 1,
					color: Color.fromRandom({alpha: 1.0})
				}
				US_CD_MAP.set(key, obj);
			}
		}
		if (d.cty) {
			const state = d.st ? d.st : "NOSTATE";
			const county = d.cny ? d.cny : "NOCOUNTY";
			const city = d.cty;
			const key = `${city}_${county}_${state}`
			if (US_CITY_MAP.has(key)) {
				const obj = US_CITY_MAP.get(key);
				obj.incidents = obj.incidents + 1;
				US_CITY_MAP.set(key, obj);
			} else {
				const obj = {
					incidents: 1,
					color: Color.fromRandom({alpha: 1.0}),
					location: `${d.lng},${d.lat}` // setting first lat/lng for now
				}
				US_CITY_MAP.set(key, obj);
			}
		}
	})

	US_STATES_MAP = new Map(Array.from(US_STATES_MAP.entries()).sort());
	US_COUNTIES_MAP = new Map(Array.from(US_COUNTIES_MAP.entries()).sort());
	US_CD_MAP = new Map(Array.from(US_CD_MAP.entries()).sort());
	US_CITY_MAP = new Map(Array.from(US_CITY_MAP.entries()).sort());

	console.log(US_STATES_MAP);
	console.log(US_COUNTIES_MAP);
	console.log(US_CD_MAP);
	console.log(US_CITY_MAP);
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
			highlightedEntities = countyEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.CD) {
			highlightedEntities = congressionalEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		} else if (props?.STATE) {
			highlightedEntities = stateEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
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
					const incidents = US_COUNTIES_MAP.get(key)?.incidents;
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
					tooltip.label.text = `${props.NAME.getValue()} - ${US_STATES_MAP.get(state?.abbr).incidents} incidents`;
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
		const loadSource = GeoJsonDataSource.load(dataSource, baseStyle);
		loadSource.then((source) => {
			viewer.dataSources.add(source);
			let entities: any[] = [];
			switch (dataSource) {
				case usCongressionalGeoJson:
					congressionalEntities = source.entities.values;
					entities = congressionalEntities;
					break;
				case usCountiesGeoJson:
					countyEntities = source.entities.values;
					entities = countyEntities;
					break;
				case usStatesGeoJson:
					stateEntities = source.entities.values;
					entities = stateEntities;
					break;
			}
			for (var i = 0; i < entities.length; i++) {
				const entity: Entity = entities[i];
				if (entity) {
					if (entity?.properties?.GEO_ID.getValue()) {
						if (entity.polygon) {
							let incidents = 0;
							let color = undefined;
							let multiplier = 50;
							const abbr = findStateByCode(entity.properties.STATE.getValue())?.abbr;
							if (entity.properties.COUNTY) {
								const county = US_COUNTIES_MAP.get(`${entity.properties.NAME.getValue()}_${abbr}`);
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
								const state = US_STATES_MAP.get(abbr);
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
		US_CITY_MAP.forEach((city, key) => {
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
					material: Color.YELLOW.withAlpha(.5),
					height: 0,
					extrudedHeight: incidents * 50
				},
			})
		})
	}

}