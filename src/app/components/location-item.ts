import {UIPoint, concatParts} from '../util';

export const template = (p: UIPoint) => {
    const {
        name, address = {
            number: '',
            municipality: '',
            street: ''
        }
    } = p;
    return `<article class="point-info">
<h3>${name || 'unknown place'}</h3>
<address>${concatParts([
        concatParts([
            address.number,
            address.street
        ], ' '),
        address.municipality])}</address>
<dl class="point-geolocation">
<dt>lng</dt><dd>${p.lng.toPrecision(8)}</dd>
<dt>lat</dt><dd>${p.lat.toPrecision(8)}</dd>
</article>`;
};
