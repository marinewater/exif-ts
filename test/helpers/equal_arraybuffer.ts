export function equalArrayBuffer( buffer1: ArrayBuffer, buffer2: ArrayBuffer ): boolean {

    if ( buffer1.byteLength !== buffer2.byteLength ) {
        return false;
    }

    const dataView1 = new Int8Array( buffer1 );
    const dataView2 = new Int8Array( buffer2 );

    for ( let i = 0 ; i < buffer1.byteLength ; i++ ) {
        if ( dataView1[ i ] !== dataView2[ i ] ) {
            return false;
        }
    }

    return true;

}
