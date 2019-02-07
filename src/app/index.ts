import store from './services/store';
import navigation from './services/navigation';
import {component as toolbarFactory} from './components/toolbar';
import {component as toolDrawerFactory} from './components/tool-drawer';

const drawer = toolDrawerFactory(store, navigation);
const toolbar = toolbarFactory(store, navigation);
drawer.appendChild(toolbar);

const body = document.querySelector('body');
const mapContainer = document.getElementById('map-container');

body.insertBefore(drawer, mapContainer);
