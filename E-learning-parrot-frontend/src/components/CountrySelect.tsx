import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

// List of countries (you can expand this list as needed)
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort();

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
}

export function CountrySelect({ value, onChange, className, inputClassName }: CountrySelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(COUNTRIES);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCountries(COUNTRIES);
    } else {
      setFilteredCountries(
        COUNTRIES.filter(country =>
          country.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search]);

  const handleSelect = (country: string) => {
    onChange(country);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        type="text"
        value={isOpen ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          setIsOpen(true);
        }}
        placeholder="Search country..."
        className={cn("w-full", inputClassName)}
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          <ScrollArea className="h-full">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSelect(country)}
                >
                  {country}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                No countries found
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
