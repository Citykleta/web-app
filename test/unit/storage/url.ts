import {Assert} from 'zora';

export default function ({test}: Assert) {
    test('you shall not pass!!', t=>{
       t.fail('arrrrrggggghhhh');
    });
}
