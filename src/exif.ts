import { exifTags } from './tags/exif';
import { gpsTags } from './tags/gps';
import { ifd1Tags } from './tags/ifd1';
import { IExifTags } from './tags/interface';
import { iptcFieldMap } from './tags/iptc_filed_map';
import { stringValues } from './tags/string_values';
import { tiffTags } from './tags/tiff';
import { xml2Object } from './xml_to_object';

export interface IImage {
    exifData?: ITags;
    iptcData?: IPTCData;
    xmpData?: IXmpData;
}

interface IPTCData {
    [ fieldName: string ]: string[] | string;
}

interface IXmpData {
    [ fieldName: string ]: string[] | string;
}

export interface ITags {
    blob?: Blob;
    JpegIFOffset?: number;
    JpegIFByteCount?: number;
    thumbnail?: ITags;
    ExifIFDPointer?: number;
    GPSInfoIFDPointer?: number;
    GPSVersionID?: number[] | string;
    ComponentsConfiguration?: number[] | string;
    FlashpixVersion?: number[] | string;
    ExifVersion?: number[] | string;
    FileSource?: number;
    [ tag: string ]: TagValue;
}

type TagValue = number | number[] | string | Blob | ITags;

export class Exif {

    public isXmpEnabled = false;
    private readonly _binaryImage: DataView;
    private _image: IImage = {};

    constructor( binaryImage: ArrayBuffer ) {

        this._binaryImage = new DataView( binaryImage );

    }

    public getData(): IImage {

        return this._handleBinaryFile();

    }

    public getAllTags(): ITags {

        if ( !this.imageHasData() ) {
            throw new Error( 'no exif data' );
        }

        const data = this._image.exifData;
        const tags: ITags = {};

        for ( const d in data ) {

            if ( data.hasOwnProperty( d ) ) {
                tags[ d ] = data[ d ];
            }
        }

        return tags;

    }

    private imageHasData() {

        return !!( this._image.exifData );

    }

    private _handleBinaryFile(): IImage {

        const exifData = this._findEXIFinJPEG();
        this._image.exifData = exifData || {};

        const iptcData = this._findIPTCinJPEG();
        this._image.iptcData = iptcData || {};

        if ( this.isXmpEnabled ) {
            const xmpData = this._findXMPinJPEG();
            this._image.xmpData = xmpData || {};
        }

        return this._image;

    }

    private _findEXIFinJPEG(): ITags {

        if ( ( this._binaryImage.getUint8( 0 ) !== 0xFF ) || ( this._binaryImage.getUint8( 1 ) !== 0xD8 ) ) {
            throw new Error( 'not a valid jpeg' );
        }

        let offset = 2;
        const length = this._binaryImage.byteLength;

        while ( offset < length ) {

            if ( this._binaryImage.getUint8( offset ) !== 0xFF ) {
                throw new Error( 'not a valid jpeg' );
            }

            const marker = this._binaryImage.getUint8( offset + 1 );

            // we could implement handling for other markers here,
            // but we're only looking for 0xFFE1 for EXIF data

            if ( marker === 225 ) {

                return this._readEXIFData( offset + 4 );

                // offset += 2 + file.getShortAt(offset+2, true);

            }
            else {
                offset += 2 + this._binaryImage.getUint16( offset + 2 );
            }

        }

    }

    private _findIPTCinJPEG(): IPTCData {

        if ( ( this._binaryImage.getUint8( 0 ) !== 0xFF ) || ( this._binaryImage.getUint8( 1 ) !== 0xD8 ) ) {
            throw new Error( 'Not a valid JPEG' );
        }

        let offset = 2;
        const length = this._binaryImage.byteLength;

        while ( offset < length ) {

            if ( this._isFieldSegmentStart( offset ) ) {

                // Get the length of the name header (which is padded to an even number of bytes)
                let nameHeaderLength = this._binaryImage.getUint8( offset + 7 );
                if ( nameHeaderLength % 2 !== 0 ) {
                    nameHeaderLength += 1;
                }

                // Check for pre photoshop 6 format
                if ( nameHeaderLength === 0 ) {
                    // Always 4
                    nameHeaderLength = 4;
                }

                const startOffset = offset + 8 + nameHeaderLength;
                const sectionLength = this._binaryImage.getUint16( offset + 6 + nameHeaderLength );

                return this._readIPTCData( startOffset, sectionLength );

            }
            // Not the marker, continue searching
            offset++;

        }
    }

    private _readIPTCData( startOffset: number, sectionLength: number ) {

        const data: IPTCData = {};
        let fieldValue;
        let fieldName;
        let dataSize;
        let segmentType;
        let segmentSize;
        let segmentStartPos = startOffset;

        while ( segmentStartPos < startOffset + sectionLength ) {

            if ( this._binaryImage.getUint8( segmentStartPos ) === 0x1C &&
                this._binaryImage.getUint8( segmentStartPos + 1 ) === 0x02 ) {

                segmentType = this._binaryImage.getUint8( segmentStartPos + 2 );

                if ( segmentType in iptcFieldMap ) {

                    dataSize = this._binaryImage.getInt16( segmentStartPos + 3 );
                    segmentSize = dataSize + 5;
                    fieldName = iptcFieldMap[segmentType];
                    fieldValue = this._getStringFromDB( segmentStartPos + 5, dataSize );

                    // Check if we already stored a value with this name
                    if ( data.hasOwnProperty( fieldName ) ) {
                        // Value already stored with this name, create multivalue field
                        if ( data[ fieldName ] instanceof Array ) {
                            ( data[ fieldName ] as string[] ).push( fieldValue );
                        }
                        else {
                            ( data[ fieldName ] as string[] ) = [ ( data[ fieldName ] as string ), fieldValue ];
                        }
                    }
                    else {
                        data[ fieldName ] = fieldValue;
                    }

                }

            }

            segmentStartPos++;
        }

        return data;

    }

    private _findXMPinJPEG(): IXmpData {

        if ( !( 'DOMParser' in window ) ) {
            throw new Error( 'XML parsing not supported without DOMParser' );
        }

        if ( ( this._binaryImage.getUint8( 0 ) !== 0xFF ) || ( this._binaryImage.getUint8( 1 ) !== 0xD8 ) ) {
            throw new Error( 'Not a valid JPEG' );
        }

        let offset = 2;
        const length = this._binaryImage.byteLength;
        const dom = new DOMParser();

        while ( offset < ( length - 4 ) ) {

            if ( this._getStringFromDB( offset, 4 ) === 'http' ) {

                const startOffset = offset - 1;
                const sectionLength = this._binaryImage.getUint16( offset - 2 ) - 1;
                let xmpString = this._getStringFromDB( startOffset, sectionLength );
                const xmpEndIndex = xmpString.indexOf( 'xmpmeta>' ) + 8;
                xmpString = xmpString.substring( xmpString.indexOf( '<x:xmpmeta' ), xmpEndIndex );

                const indexOfXmp = xmpString.indexOf( 'x:xmpmeta' ) + 10;

                // Many custom written programs embed xmp/xml without any namespace. Following are some of them.
                // Without these namespaces, XML is thought to be invalid by parsers
                xmpString = xmpString.slice( 0, indexOfXmp )
                    + 'xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" '
                    + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
                    + 'xmlns:tiff="http://ns.adobe.com/tiff/1.0/" '
                    + 'xmlns:plus="http://schemas.android.com/apk/lib/com.google.android.gms.plus" '
                    + 'xmlns:ext="http://www.gettyimages.com/xsltExtension/1.0" '
                    + 'xmlns:exif="http://ns.adobe.com/exif/1.0/" '
                    + 'xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#" '
                    + 'xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#" '
                    + 'xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" '
                    + 'xmlns:xapGImg="http://ns.adobe.com/xap/1.0/g/img/" '
                    + 'xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
                    + xmpString.slice( indexOfXmp );

                const domDocument = dom.parseFromString( xmpString, 'text/xml' );
                return xml2Object( domDocument ) as IXmpData;

            }
            else {
                offset++;
            }
        }

    }

    private _getStringFromDB( start: number, length: number ): string {

        let outString = '';
        for ( let n = start; n < start + length; n++ ) {
            outString += String.fromCharCode( this._binaryImage.getUint8( n ) );
        }

        return outString;

    }

    private _readTagValue( entryOffset: number, tiffStart: number, bigEnd: boolean ): TagValue {

        const type = this._binaryImage.getUint16( entryOffset + 2, !bigEnd );
        const numValues = this._binaryImage.getUint32( entryOffset + 4, !bigEnd );
        const valueOffset = this._binaryImage.getUint32( entryOffset + 8, !bigEnd ) + tiffStart;
        let offset;
        let vals;
        let val;
        let numerator;
        let denominator;

        switch ( type ) {
            case 1: // byte, 8-bit unsigned int
            case 7: // undefined, 8-bit byte, value depending on field
                if ( numValues === 1 ) {
                    return this._binaryImage.getUint8( entryOffset + 8 );
                }
                else {
                    offset = numValues > 4 ? valueOffset : ( entryOffset + 8 );
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        vals[n] = this._binaryImage.getUint8( offset + n );
                    }
                    return vals;
                }

            case 2: // ascii, 8-bit byte
                offset = numValues > 4 ? valueOffset : ( entryOffset + 8 );
                return this._getStringFromDB( offset, numValues - 1 );

            case 3: // short, 16 bit int
                if ( numValues === 1 ) {
                    return this._binaryImage.getUint16( entryOffset + 8, !bigEnd );
                }
                else {
                    offset = numValues > 2 ? valueOffset : ( entryOffset + 8 );
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        vals[n] = this._binaryImage.getUint16( offset + 2 * n, !bigEnd );
                    }
                    return vals;
                }

            case 4: // long, 32 bit int
                if ( numValues === 1 ) {
                    return this._binaryImage.getUint32( entryOffset + 8, !bigEnd );
                }
                else {
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        vals[n] = this._binaryImage.getUint32( valueOffset + 4 * n, !bigEnd );
                    }
                    return vals;
                }

            case 5:    // rational = two long values, first is numerator, second is denominator
                if ( numValues === 1 ) {
                    numerator = this._binaryImage.getUint32( valueOffset, !bigEnd );
                    denominator = this._binaryImage.getUint32( valueOffset + 4, !bigEnd );
                    val = numerator / denominator;
                    return val;
                }
                else {
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        numerator = this._binaryImage.getUint32( valueOffset + 8 * n, !bigEnd );
                        denominator = this._binaryImage.getUint32( valueOffset + 4 + 8 * n, !bigEnd );
                        vals[n] = numerator / denominator;
                    }
                    return vals;
                }

            case 9: // slong, 32 bit signed int
                if ( numValues === 1 ) {
                    return this._binaryImage.getInt32( entryOffset + 8, !bigEnd );
                }
                else {
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        vals[n] = this._binaryImage.getInt32( valueOffset + 4 * n, !bigEnd );
                    }
                    return vals;
                }

            case 10: // signed rational, two slongs, first is numerator, second is denominator
                if ( numValues === 1 ) {
                    return this._binaryImage.getInt32( valueOffset, !bigEnd ) /
                        this._binaryImage.getInt32( valueOffset + 4, !bigEnd );
                }
                else {
                    vals = [];
                    for ( let n = 0; n < numValues; n++ ) {
                        vals[n] = this._binaryImage.getInt32( valueOffset + 8 * n, !bigEnd ) /
                            this._binaryImage.getInt32( valueOffset + 4 + 8 * n, !bigEnd );
                    }
                    return vals;
                }
        }
    }

    private _readEXIFData( start: number ): ITags {

        if ( this._getStringFromDB( start, 4 ) !== 'Exif' ) {
            throw new Error( 'no exif data' );
        }

        let bigEnd: boolean;
        let tags: ITags;
        let tag;
        let exifData;
        const tiffOffset = start + 6;

        // test for TIFF validity and endianness
        if ( this._binaryImage.getUint16( tiffOffset ) === 0x4949 ) {
            bigEnd = false;
        }
        else if ( this._binaryImage.getUint16( tiffOffset ) === 0x4D4D ) {
            bigEnd = true;
        }
        else {
            throw new Error( 'not a valid jpeg' );
        }

        if ( this._binaryImage.getUint16( tiffOffset + 2, !bigEnd ) !== 0x002A ) {
            throw new Error( 'not a valid jpeg' );
        }

        const firstIFDOffset = this._binaryImage.getUint32( tiffOffset + 4, !bigEnd );

        if ( firstIFDOffset < 0x00000008 ) {
            throw new Error( 'not a valid jpeg' );
        }

        tags = this._readTags( tiffOffset, tiffOffset + firstIFDOffset, tiffTags, bigEnd );

        if ( tags.ExifIFDPointer ) {

            exifData = this._readTags( tiffOffset, tiffOffset + tags.ExifIFDPointer, exifTags, bigEnd );
            for ( tag in exifData ) {

                if ( exifData.hasOwnProperty( tag ) ) {

                    switch ( tag ) {
                        case 'LightSource':
                        case 'Flash':
                        case 'MeteringMode':
                        case 'ExposureProgram':
                        case 'SensingMethod':
                        case 'SceneCaptureType':
                        case 'SceneType':
                        case 'CustomRendered':
                        case 'WhiteBalance':
                        case 'GainControl':
                        case 'Contrast':
                        case 'Saturation':
                        case 'Sharpness':
                        case 'SubjectDistanceRange':
                        case 'FileSource':
                            exifData[ tag ] = stringValues[ tag ][ exifData[ tag ] as number ];
                            break;

                        case 'ExifVersion':
                        case 'FlashpixVersion':
                            exifData[tag] = String.fromCharCode( exifData[ tag ][ 0 ] as number,
                                exifData[ tag ][ 1 ] as number,
                                exifData[tag][ 2 ] as number,
                                exifData[ tag ][ 3 ] as number );
                            break;

                        case 'ComponentsConfiguration':
                            exifData[tag] =
                                stringValues.Components[ ( exifData[ tag ][ 0 ] as number ) ] +
                                stringValues.Components[ ( exifData[ tag ][ 1 ] as number ) ] +
                                stringValues.Components[ ( exifData[ tag ][ 2 ] as number ) ] +
                                stringValues.Components[ ( exifData[ tag ][ 3 ] as number ) ];
                            break;
                    }
                    tags[ tag ] = exifData[ tag ];

                }
            }
        }

        if ( tags.GPSInfoIFDPointer ) {

            const gpsData = this._readTags( tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, gpsTags, bigEnd );
            for ( tag in gpsData ) {
                if ( gpsData[ tag ] ) {
                    switch ( tag ) {
                        case 'GPSVersionID':
                            gpsData[tag] = gpsData[ tag ][ 0 ] +
                                '.' + gpsData[ tag ][ 1 ] +
                                '.' + gpsData[ tag ][ 2 ] +
                                '.' + gpsData[ tag ][ 3 ];
                            break;
                    }
                    tags[tag] = gpsData[tag];
                }
            }

        }

        // extract thumbnail
        tags.thumbnail = this._readThumbnailImage( tiffOffset, firstIFDOffset, bigEnd );

        return tags;
    }

    private _readTags( tiffStart: number, dirStart: number, strings: IExifTags, bigEnd: boolean ): ITags {

        const entries = this._binaryImage.getUint16( dirStart, !bigEnd );
        const tags: ITags = {};

        for ( let i = 0; i < entries; i++ ) {

            const entryOffset = dirStart + i * 12 + 2;
            const tag = strings[ this._binaryImage.getUint16( entryOffset, !bigEnd ) ];
            tags[ tag ] = this._readTagValue( entryOffset, tiffStart, bigEnd );

        }

        return tags;

    }

    private _readThumbnailImage( tiffStart: number, firstIFDOffset: number, bigEnd: boolean ): ITags {

        // get the IFD1 offset
        const ifd1OffsetPointer = this._getNextIFDOffset( tiffStart + firstIFDOffset, bigEnd );

        if ( !ifd1OffsetPointer ) {
            return {};
        }
        else if ( ifd1OffsetPointer > this._binaryImage.byteLength ) { // this should not happen
            return {};
        }

        const thumbTags = this._readTags( tiffStart, tiffStart + ifd1OffsetPointer, ifd1Tags, bigEnd );

        // EXIF 2.3 specification for JPEG format thumbnail

        // If the value of Compression(0x0103) Tag in IFD1 is '6', thumbnail image format is JPEG.
        // Most of Exif image uses JPEG format for thumbnail. In that case, you can get offset of thumbnail
        // by JpegIFOffset(0x0201) Tag in IFD1, size of thumbnail by JpegIFByteCount(0x0202) Tag.
        // Data format is ordinary JPEG format, starts from 0xFFD8 and ends by 0xFFD9. It seems that
        // JPEG format and 160x120pixels of size are recommended thumbnail format for Exif2.1 or later.
        if ( thumbTags.Compression ) {

            switch ( thumbTags.Compression ) {
                case 6:
                    if ( thumbTags.JpegIFOffset && thumbTags.JpegIFByteCount ) {
                        // extract the thumbnail
                        const tOffset = tiffStart + thumbTags.JpegIFOffset;
                        const tLength = thumbTags.JpegIFByteCount;
                        thumbTags.blob = new Blob( [ new Uint8Array( this._binaryImage.buffer, tOffset, tLength ) ], {
                            type: 'image/jpeg'
                        } );
                    }
                    break;
            }

        }

        return thumbTags;

    }

    private _isFieldSegmentStart( offset: number ): boolean {

        return (
            this._binaryImage.getUint8( offset ) === 0x38 &&
            this._binaryImage.getUint8( offset + 1 ) === 0x42 &&
            this._binaryImage.getUint8( offset + 2 ) === 0x49 &&
            this._binaryImage.getUint8( offset + 3 ) === 0x4D &&
            this._binaryImage.getUint8( offset + 4 ) === 0x04 &&
            this._binaryImage.getUint8( offset + 5 ) === 0x04
        );

    }

    private _getNextIFDOffset( dirStart: number, bigEnd: boolean ): number {

        // the first 2bytes means the number of directory entries contains in this IFD
        const entries = this._binaryImage.getUint16( dirStart, !bigEnd );

        // After last directory entry, there is a 4bytes of data,
        // it means an offset to next IFD.
        // If its value is '0x00000000', it means this is the last IFD and there is no linked IFD.
        return this._binaryImage.getUint32( dirStart + 2 + entries * 12, !bigEnd ) ; // each entry is 12 bytes long

    }

}
