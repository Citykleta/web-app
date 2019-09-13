import {once} from "../utils";
import {LeisurePanel} from "./elements/leisure-panel";
import {html} from "lit-html";
import {ServiceRegistry} from "../common/service-registry";

export const loadServices = once((registry: ServiceRegistry, store) => {
    // todo
});

export const loadComponents = once(injector => {
    customElements.define('citykleta-leisure-panel', LeisurePanel);
});

export const view = () => html`<citykleta-leisure-panel class="panel"></citykleta-leisure-panel>`;