"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/lib/distance";

export interface SelectedDeliveryPlace {
  placeId: string;
  address: string;
  coordinates: Coordinates;
}

interface GooglePlace {
  id?: string;
  formattedAddress?: string;
  location?: {
    lat(): number;
    lng(): number;
  };
  fetchFields(options: { fields: string[] }): Promise<void>;
}

interface GoogleAutocompleteElement extends HTMLElement {
  includedRegionCodes: string[];
  locationBias?: {
    center: { lat: number; lng: number };
    radius: number;
  };
  placeholder: string;
}

interface GooglePlacesLibrary {
  PlaceAutocompleteElement: new () => GoogleAutocompleteElement;
}

declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary(name: "places"): Promise<GooglePlacesLibrary>;
      };
    };
  }
}

export function DeliveryAddressAutocomplete({
  apiKey,
  locationBias,
  onSelect,
}: {
  apiKey: string;
  locationBias: Coordinates;
  onSelect: (place: SelectedDeliveryPlace | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !window.google || !containerRef.current) return;

    let disposed = false;
    let selectionVersion = 0;
    let autocomplete: GoogleAutocompleteElement | null = null;
    let onSelectPlace: ((event: Event) => void) | null = null;
    let onInput: (() => void) | null = null;

    async function mountAutocomplete() {
      try {
        const places = await window.google?.maps.importLibrary("places");
        if (disposed || !places || !containerRef.current) return;

        autocomplete = new places.PlaceAutocompleteElement();
        autocomplete.includedRegionCodes = ["cl"];
        autocomplete.locationBias = {
          center: {
            lat: locationBias.latitude,
            lng: locationBias.longitude,
          },
          radius: 30_000,
        };
        autocomplete.placeholder = "Calle y número en Puerto Natales";
        autocomplete.setAttribute("aria-label", "Buscar dirección de despacho");
        autocomplete.style.display = "block";
        autocomplete.style.width = "100%";

        onInput = () => {
          selectionVersion += 1;
          onSelect(null);
        };
        onSelectPlace = (rawEvent) => {
          const currentVersion = ++selectionVersion;
          const event = rawEvent as Event & {
            placePrediction?: { toPlace(): GooglePlace };
          };
          const place = event.placePrediction?.toPlace();
          if (!place?.id) {
            setError("Selecciona una dirección de las sugerencias de Google Maps.");
            onSelect(null);
            return;
          }

          setError(null);
          void place
            .fetchFields({ fields: ["formattedAddress", "location"] })
            .then(() => {
              if (disposed || currentVersion !== selectionVersion) return;
              const latitude = place.location?.lat();
              const longitude = place.location?.lng();
              if (
                !place.formattedAddress ||
                latitude === undefined ||
                longitude === undefined ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
              ) {
                setError("Google Maps no pudo precisar esa dirección. Prueba otra sugerencia.");
                onSelect(null);
                return;
              }

              onSelect({
                placeId: place.id!,
                address: place.formattedAddress,
                coordinates: { latitude, longitude },
              });
            })
            .catch(() => {
              if (disposed || currentVersion !== selectionVersion) return;
              setError("No se pudo consultar esa dirección. Intenta seleccionarla de nuevo.");
              onSelect(null);
            });
        };

        autocomplete.addEventListener("input", onInput);
        autocomplete.addEventListener("gmp-select", onSelectPlace);
        containerRef.current.appendChild(autocomplete);
      } catch {
        setError("No se pudo cargar el buscador de direcciones de Google Maps.");
      }
    }

    void mountAutocomplete();

    return () => {
      disposed = true;
      if (autocomplete && onSelectPlace) {
        autocomplete.removeEventListener("gmp-select", onSelectPlace);
      }
      if (autocomplete && onInput) {
        autocomplete.removeEventListener("input", onInput);
      }
      autocomplete?.remove();
    };
  }, [apiKey, locationBias, onSelect, scriptReady]);

  return (
    <div className="flex flex-col gap-2">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places&language=es&region=CL`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setError("No se pudo cargar Google Maps. Intenta nuevamente más tarde.")}
      />
      <div ref={containerRef} className="min-h-12 rounded-lg bg-cream" />
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
