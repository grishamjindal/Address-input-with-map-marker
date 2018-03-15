import { Component, NgZone, OnInit, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MdSnackBar } from '@angular/material';
import { MouseEvent, MapsAPILoader } from '@agm/core';
import { } from '@types/googlemaps';

declare var google: any;

@Component({
  selector: 'app-map-marker',
  templateUrl: './map-marker.component.html',
  styleUrls: ['./map-marker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapMarkerComponent),
      multi: true
    }
  ]
})

export class MapMarkerComponent implements OnInit, ControlValueAccessor {

  label: string;
  // google maps zoom level
  zoom = 14;
  // initial center position for the map
  lat = 28.457523;
  lng = 77.026344;
  markerClicked = false;

  private geoCoder;
  @ViewChild('searchBox')
  public searchElementRef: ElementRef;

  propagateChange = (_: any) => {};

  constructor(private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, public snackBar: MdSnackBar) { }

  writeValue(value: any) {
    if (value) {
      this.mapsAPILoader.load().then(() => {
        // Fetch GeoCoder for reverse geocoding
        this.geoCoder = new google.maps.Geocoder;
        this.fetchAddress(value.coords.latitude, value.coords.longitude);
      });
    }
  }

  registerOnChange( fn: any ): void {
    this.propagateChange = fn;
  }

  registerOnTouched() {}

  ngOnInit() {
    this.mapsAPILoader.load().then(() => {
      // Fetch GeoCoder for reverse geocoding
      this.geoCoder = new google.maps.Geocoder;
      // set current position
      if (!this.markerClicked) {
        this.setCurrentPosition();
      }

      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement, {
        types: ['address'],
        componentRestrictions: {country: 'in'}
      });

      autocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
          // get the place result
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();
          // verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          // set latitude, longitude and zoom
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.zoom = 17;
        });
      });
    });
  }

  setCurrentPosition() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        this.zoom = 18;
        this.fetchAddress(this.lat, this.lng);
      });
      this.markerClicked = true;
    }
  }

  fetchAddress(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    this.markerClicked = true;
    this.zoom = 18;
    this.geoCoder.geocode({'location': {lat: lat, lng: lng }}, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          this.searchElementRef.nativeElement.value = results[0].formatted_address;
          this.label = results[0].formatted_address;
          const location = {
            'place_id': results[0].place_id ? results[0].place_id : null,
            'address': results[0].formatted_address ? results[0].formatted_address : null,
            'coords': {
              'latitude': lat ? lat : null,
              'longitude': lng ? lng : null
            }
          }
          this.propagateChange(location);
        } else {
          this.openSnackbar('No results found', 'ok', 3000);
        }
      } else {
        this.openSnackbar('Geocoder failed due to: ' + status, 'ok', 4000);
      }
    });
  }

  mapClicked($event: MouseEvent) {
    this.fetchAddress($event.coords.lat, $event.coords.lng);
  }

  markerDragEnd($event: MouseEvent) {
    this.fetchAddress($event.coords.lat, $event.coords.lng);
  }

  openSnackbar(message, action, time) {
    this.snackBar.open(message, action, {
      duration: time
    });
  }

}
