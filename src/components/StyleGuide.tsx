import React from 'react';

const StyleGuide: React.FC = () => {
  const fontWeights = [
    { weight: 100, name: 'Thin' },
    { weight: 200, name: 'Extra Light' },
    { weight: 300, name: 'Light' },
    { weight: 400, name: 'Regular' },
    { weight: 500, name: 'Medium' },
    { weight: 600, name: 'Semi Bold' },
    { weight: 700, name: 'Bold' },
    { weight: 800, name: 'Extra Bold' },
    { weight: 900, name: 'Black' }
  ];

  const colors = [
    { name: 'Black', class: 'bg-black text-white', hex: '#000000' },
    { name: 'White', class: 'bg-white text-black border border-gray-200', hex: '#ffffff' },
    { name: 'Gray 100', class: 'bg-gray-100 text-black', hex: '#f3f4f6' },
    { name: 'Gray 200', class: 'bg-gray-200 text-black', hex: '#e5e7eb' },
    { name: 'Gray 300', class: 'bg-gray-300 text-black', hex: '#d1d5db' },
    { name: 'Gray 600', class: 'bg-gray-600 text-white', hex: '#4b5563' },
    { name: 'Gray 700', class: 'bg-gray-700 text-white', hex: '#374151' },
    { name: 'Gray 800', class: 'bg-gray-800 text-white', hex: '#1f2937' }
  ];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Off-Script Style Guide</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Typography: Barlow Semi Condensed</h2>
        <div className="space-y-6">
          {fontWeights.map((font) => (
            <div key={font.weight} className="flex items-center">
              <div className="w-24 text-sm text-gray-500">{font.name} {font.weight}</div>
              <p style={{ fontWeight: font.weight }} className="text-2xl">
                Barlow Semi Condensed - The quick brown fox jumps over the lazy dog
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {colors.map((color) => (
            <div key={color.name} className="rounded-lg overflow-hidden shadow-md">
              <div className={`h-24 ${color.class} flex items-end p-3`}></div>
              <div className="p-4 bg-white">
                <h3 className="font-medium">{color.name}</h3>
                <p className="text-sm text-gray-500">{color.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Text Styles</h2>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Heading 1 (text-4xl font-bold)</h1>
            <p className="text-gray-500 text-sm mt-1">Used for main page titles</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Heading 2 (text-3xl font-semibold)</h2>
            <p className="text-gray-500 text-sm mt-1">Used for section titles</p>
          </div>
          <div>
            <h3 className="text-2xl font-medium">Heading 3 (text-2xl font-medium)</h3>
            <p className="text-gray-500 text-sm mt-1">Used for subsection titles</p>
          </div>
          <div>
            <h4 className="text-xl font-medium">Heading 4 (text-xl font-medium)</h4>
            <p className="text-gray-500 text-sm mt-1">Used for card titles</p>
          </div>
          <div>
            <p className="text-base">Body text (text-base)</p>
            <p className="text-gray-500 text-sm mt-1">Used for main content</p>
          </div>
          <div>
            <p className="text-sm">Small text (text-sm)</p>
            <p className="text-gray-500 text-sm mt-1">Used for secondary information</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StyleGuide; 