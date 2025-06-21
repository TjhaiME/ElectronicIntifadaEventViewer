
const markerPositionMap = {};
const locationCount = {};  // Tracks how many markers already at a given position




// Helper to safely format event date into a real ISO string
function formatYMD(dateObj) {
    if (!dateObj || typeof dateObj.year !== 'number') return null;
    const { year, month = 1, day = 1 } = dateObj;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
}

// Load events and initialize the visualization
fetch('events.json')
    .then(res => res.json())
    .then(events => {
        const validEvents = events.filter(e => formatYMD(e.event.date));
        const allDates = validEvents.map(e => formatYMD(e.event.date)).sort((a, b) => a - b);
        const minDate = allDates[0];
        const maxDate = allDates[allDates.length - 1];

        // Initialize the map
        // const map = L.map('map').setView([31.5, 34.8], 8);

        const map = L.map('map', {
            center: [31.9522, 35.2332], // Example: Palestine
            zoom: 7,
            attributionControl: false
        });

        L.control.attribution({
            prefix: '<img src="Pflag.png" alt="Palestine Flag" height="20"> Data from <a href="https://electronicintifada.net/">Electronic Intifada</a><a>, events and locations extracted with 4o-mini, locations geocoded with GeoNames, there are some mistakes. Colours are PCA reduced semantic vector embeddings of the event type</a>'
        }).addTo(map);


        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const markerGroup = L.layerGroup().addTo(map);

        // Initialize the timeline slider
        const slider = document.getElementById('slider');
        noUiSlider.create(slider, {
            start: [minDate.getTime(), maxDate.getTime()],
            connect: true,
            range: {
                //min: minDate.getTime(),
                min: new Date(Date.UTC(1900, 0, 1)).getTime(),
                max: maxDate.getTime()
            },
            step: 24 * 60 * 60 * 1000, // one day
            format: {
                to: value => +value,
                from: value => +value
            }
        });

        // Label for current date range
        const label = document.getElementById('range-label');
        function updateLabel(start, end) {
            label.textContent = `${new Date(start).toDateString()} - ${new Date(end).toDateString()}`;
        }

        // Update markers based on selected date range
        function updateMarkers([start, end]) {
            markerGroup.clearLayers();
            Object.keys(locationCount).forEach(key => locationCount[key] = 0);  // 💥 Reset count
            const startDate = new Date(+start);
            const endDate = new Date(+end);

            validEvents.forEach(event => {
                const date = formatYMD(event.event.date);
                if (!date || date < startDate || date > endDate) return;


                const { lat, lng } = event.geo;


                // const latNum = parseFloat(lat);
                // const lngNum = parseFloat(lng);
                // const key = `${latNum.toFixed(5)},${lngNum.toFixed(5)}`;
                // const count = locationCount[key] = (locationCount[key] || 0) + 1;

                // let offsetLat = latNum;
                // let offsetLng = lngNum;

                // if (count > 1) {
                //     const angle = count * 2.399963229728653; // golden angle in radians (approx. 137.5°)
                //     const r = 0.00002 * Math.sqrt(count); // small radius for tight packing

                //     offsetLat += r * Math.sin(angle); // switched sin/cos to even out spiral
                //     offsetLng += r * Math.cos(angle);
                // }


                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);
                const key = `${latNum.toFixed(5)},${lngNum.toFixed(5)}`;
                const count = locationCount[key] = (locationCount[key] || 0) + 1;

                let offsetLat = latNum;
                let offsetLng = lngNum;

                if (count > 1) {
                    const index = count - 2; // 0-based index for displacement
                    const angle = index * 2.399963229728653; // golden angle in radians
                    const r = 0.00008 * Math.sqrt(index); // radius starts at 0 for first displaced point

                    offsetLat += r * Math.cos(angle);
                    offsetLng += r * Math.sin(angle);
                }



                // Continue as before
                const color = `rgb(${event.color.join(',')})`;
                const url = event.source_url.replace(/\.json$/, '');
                const dateObj = event.event.date || {};
                const formattedDate = [
                    dateObj.year ?? 'YYYY',
                    dateObj.month?.toString().padStart(2, '0') ?? 'MM',
                    dateObj.day?.toString().padStart(2, '0') ?? 'DD',
                ].join('-');
                const timeStr = dateObj.time ? ` at ${dateObj.time}` : '';

                const popupContent = `
                    <strong>${event.event.description}</strong><br>
                    <em>${formattedDate}${timeStr}</em><br>
                    <a href="${url}" target="_blank">${url}</a>
                `;

                L.circleMarker([offsetLat, offsetLng], {
                    radius: 6,
                    fillColor: color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).bindPopup(popupContent).addTo(markerGroup);

                //////////////////////////////////////////////////////////////////




            });

            updateLabel(start, end);
        }

        // Initial update
        updateMarkers([minDate.getTime(), maxDate.getTime()]);
        slider.noUiSlider.on('update', updateMarkers);
    })
    .catch(err => console.error('Error loading events.json:', err));
