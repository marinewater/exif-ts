import { assert } from 'chai';
import { JSDOM } from 'jsdom';
import { describe, it } from 'mocha';
import { xml2Object } from '../../src/xml_to_object';

describe( 'xml2Object', function() {

    it( 'xml2Object', function() {

        const { document } = ( new JSDOM( '<test>value</test>', { contentType: 'text/xml' } ) ).window;

        const obj = xml2Object( document );

        assert.deepStrictEqual( obj, { test: { '#text': 'value' } } );

    } );
} );
