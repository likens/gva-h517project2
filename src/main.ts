import './style.css'
import { Color, GeoJsonDataSource, Viewer, CallbackProperty, ColorMaterialProperty, Entity, Cartesian2, defined, ScreenSpaceEventType, HorizontalOrigin, VerticalOrigin, Cartographic, Ray, JulianDate, Cartesian3 } from 'cesium'

const highlightColor = Color.RED.withAlpha(.8);
const baseColor = Color.WHITE.withAlpha(.2);

const baseStyle = {
	stroke: Color.WHITE.withAlpha(.3),
	fill: baseColor
}

const usCongressional = "us_congressional.json";
const usCounties = "us_counties.json";
const usStates = "us_states.json";

let highlightedEntities: any[] = [];
let congressionalEntities: any[] = [];
let countyEntities: any[] = [];
let stateEntities: any[] = [];

const viewer = new Viewer("cesium");
const scene = viewer.scene;
const camera = viewer.camera;
const handler = viewer.screenSpaceEventHandler;

camera.flyTo({
	destination: new Cartesian3(-1053594.94012635, -8153616.159871477, 6250954.07672872),
	orientation: {
		heading: 6.283185307179583,
		pitch: -1.5691840981764815,
		roll: 0
	},
	duration: 1
})

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

const createCallback = (entity: Entity) => {
	const colorProperty = new CallbackProperty((_t, r) => {
		if (highlightedEntities.length) {
			if (highlightedEntities.find((e: Entity) => e.id === entity.id)) {
				return Color.clone(highlightColor, r);
			}
		}
		return Color.clone(baseColor, r);
	}, false);
	
	return new ColorMaterialProperty(colorProperty);
}

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
		} else {
			highlightedEntities = stateEntities.filter(e => e.properties?.getValue(JulianDate.now()).GEO_ID === props.GEO_ID);
		}
	} else{
		highlightedEntities = [];
	}

	if (cartesian) {
		if (pick?.id?.name) {
			const ray: Ray | undefined = viewer.camera.getPickRay(movement.endPosition);
			tooltip.position = cartesian ? cartesian : scene.globe.pick(ray ? ray : new Ray(), scene);
			tooltip.label.show = true;
			tooltip.label.text = pick.id.name;
			tooltip.label.font = "20px sans-serif";
		}
		else {
			tooltip.label.show = false;
		}

	} else {
		tooltip.label.show = false;
	}

}, ScreenSpaceEventType.MOUSE_MOVE);

const setupDataSource = (dataSource: string) => {
	viewer.dataSources.removeAll();
	const loadSource = GeoJsonDataSource.load(dataSource, baseStyle);
	loadSource.then((source) => {
		viewer.dataSources.add(source);
		let entities: any[] = [];
		switch (dataSource) {
			case usCongressional:
				congressionalEntities = source.entities.values;
				entities = congressionalEntities;
				break;
			case usCounties:
				countyEntities = source.entities.values;
				entities = countyEntities;
				break;
			case usStates:
				stateEntities = source.entities.values;
				entities = stateEntities;
				break;
		}
		for (var i = 0; i < entities.length; i++) {
			const entity: Entity = entities[i];
			if (entity) {
				if (entity.polygon) {
					entity.polygon.material = createCallback(entity);
				}
			}
		}
	})
}

setupDataSource(usStates);

const setupDataSourceButtons = (buttons: HTMLButtonElement[]) => {
	buttons.forEach(btn => btn.addEventListener('click', () => setupDataSource(btn.dataset.source as any)));
}

setupDataSourceButtons(Array.from(document.querySelectorAll<HTMLButtonElement>('#toolbar button')))



// Promise.all([fetch('location_only_2017.json').then(r => r.json())]).then(f => {
// 	const locations: any[] = f[0];
// 	console.log("found", locations.length, "results");
// 	locations.forEach((l: any) => {
// 		if (l.lng && l.lat) {
// 			// viewer.entities.add({
// 			// 	position: Cartesian3.fromDegrees(l.lng, l.lat, 0),
// 			// 	point: {
// 			// 		pixelSize: 2,
// 			// 		heightReference : HeightReference.CLAMP_TO_GROUND,
// 			// 		color: Color.WHITE,
// 			// 	},
// 			// })
// 		}
// 	})
// })