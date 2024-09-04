// AddressAutocomplete.js
import React from 'react';
import usePlacesAutocomplete, { getGeocode } from 'use-places-autocomplete';
import useOnclickOutside from 'react-cool-onclickoutside';

const AddressAutocomplete = ({ setAddressData }) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search area or bias */
    },
    debounce: 300,
  });

  const ref = useOnclickOutside(() => {
    clearSuggestions();
  });

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const handleSelect = ({ description }) => () => {
    setValue(description, false);
    clearSuggestions();

    getGeocode({ address: description })
      .then((results) => {
        const parsedAddress = parseAddressComponents(results[0].address_components);
        setAddressData(parsedAddress); // Pass parsed address data to parent
      })
      .catch((error) => {
        console.error("Error fetching geocode: ", error);
      });
  };

  const parseAddressComponents = (components) => {
    const address = {
      street: '',
      city: '',
      state: '',
      zip: '',
      county: '',
    };

    components.forEach((component) => {
      const types = component.types;
      if (types.includes('street_number')) {
        address.street = component.long_name + ' ' + address.street;
      }
      if (types.includes('route')) {
        address.street += component.long_name;
      }
      if (types.includes('locality')) {
        address.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        address.state = component.short_name;
      }
      if (types.includes('postal_code')) {
        address.zip = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        address.county = component.long_name;
      }
    });

    return address;
  };

  return (
    <div ref={ref}>
      <input
        value={value}
        onChange={handleInput}
        disabled={!ready}
        placeholder="Enter a street address"
        className="clp-input"
      />
      {status === 'OK' && (
        <ul>
          {data.map(({ place_id, description }) => (
            <li key={place_id} onClick={handleSelect({ description })}>
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
