import {LitElement, html} from 'lit-element';

export class App extends LitElement {
    render() {
        return html`
<link rel="stylesheet" href="app.css">
<citykleta-navigation-bar></citykleta-navigation-bar>
<citykleta-search-panel class="panel"></citykleta-search-panel>
`;
    }
}
