import { base64ToArrayBuffer } from './convert';

function read_blob( blob: Blob ): Promise<ArrayBuffer> {

    return new Promise( function( resolve, reject ) {

        const fileReader = new FileReader();
        fileReader.onload = function( e ) {
            resolve( e.target.result as ArrayBuffer );
        };

        fileReader.onerror = ( error ) => reject( error );

        fileReader.readAsArrayBuffer( blob );

    } );

}

function read_http( url: string ): Promise<ArrayBuffer> {

    return new Promise( function( resolve, reject ) {

        let http = new XMLHttpRequest();
        http.onload = function() {

            if ( this.status === 200 || this.status === 0 ) {
                resolve( http.response );
            }
            else {
                reject( 'Could not load image' );
            }

            http = null;

        };

        http.open( 'GET', url, true );
        http.responseType = 'arraybuffer';
        http.send( null );

    } );

}

function read_blob_url( url: string ): Promise<Blob> {

    return new Promise( function( resolve, reject ) {

        const http = new XMLHttpRequest();

        http.open( 'GET', url, true );
        http.responseType = 'blob';

        http.onload = function() {
            if ( this.status === 200 || this.status === 0 ) {
                resolve( this.response );
            }
        };

        http.onerror = function( error ) {

            reject( error );

        };

        http.send();

    } );

}

export function getBinaryData( file: any ): Promise<ArrayBuffer> {

    if ( file.src ) {
        if ( /^data:/i.test( file.src ) ) { // Data URI

            return Promise.resolve( base64ToArrayBuffer( file.src ) );

        }
        else if ( /^blob:/i.test( file.src ) ) { // Object URL

            return read_blob_url( file.src )
                .then( ( blob: Blob ) => read_blob( blob ) );

        }
        else {

            return read_http( file.src );

        }

    }
    else if ( FileReader && ( file instanceof Blob || file instanceof File ) ) {

        return read_blob( file );

    }
    else {
        return Promise.reject( 'unknown source type' );
    }

}
