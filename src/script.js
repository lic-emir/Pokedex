const containerPokemon = document.querySelector(".container-pokemon");
const container = document.querySelector(".container");
const btnContainer = document.querySelector('.btn-container');
const searchInput = document.querySelector('#search-pokemon');
const menuTypes = document.querySelector('.dropdown__sub');
const favorites = document.querySelector('#favoritos');
let modal = document.querySelector('.modal');
let urlGeneral = "https://pokeapi.co/api/v2/pokemon";
const urlType = "https://pokeapi.co/api/v2/type";
let pokemonsByType = [];
let currentPage = 0;
const limit = 20;
let timeout;
let btnPrev, btnNext;
let allPokemons = [];
let currentView = 'home';
const pokemonCache = new Map();

window.addEventListener("load", () => {
  loadAllPokemons();
  loadMenuType();
  loadPokemons();
});

btnContainer.addEventListener("click", e => {
  if (e.target.id === "next") {
    currentPage++;
    animatePageChange(() => {
      renderTypePage();
    });
  }

  if (e.target.id === "prev") {
    currentPage--;
    animatePageChange(() => {
      renderTypePage();
    });
  }
  const url = e.target.closest("button")?.dataset.page;
  if (!url) return;

  urlGeneral = url;
  animatePageChange(() => {
    loadPokemons();
  });
});

searchInput.addEventListener('input', () => {
  anime({
    targets: '.search-box',
    scale: [1, 1.03, 1],
    duration: 250,
    easing: 'easeOutQuad'
  });
});

searchInput.addEventListener("input", e => {
  clearTimeout(timeout);

  timeout = setTimeout(() => {
    searchPokemon(e.target.value);
  }, 400);
});
menuTypes.addEventListener('click', e => {
  let type = e.target.closest('a')?.dataset.type;
  if (!type) return;
  currentView = 'home';
  loadTypesPokemons(`https://pokeapi.co/api/v2/type/${type}`);
});
containerPokemon.addEventListener('click', e => {
  const btnFavorite = e.target.closest('.btn-favorite');
  const btnCard = e.target.closest('.card');
  if (!btnFavorite && !btnCard) return;
  if (btnFavorite) {
    let svg = btnFavorite.querySelector('svg');

    if (svg.classList.contains('icon-red')) {
      svg.classList.remove('icon-red');
      deleteFavorite(btnFavorite.dataset.id);
    } else {
      svg.classList.add('icon-red');
      addFavorite({
        id: btnFavorite.dataset.id,
        name: btnFavorite.dataset.name,
        img: btnFavorite.dataset.img,
        types: btnFavorite.dataset.types
      });
    }
  } else if (btnCard) {
    const id = btnCard.dataset.cardId;
    // Si no está en cache (ej. favoritos tras recargar), pasamos un objeto mínimo con el ID
    const pokemon = pokemonCache.get(id) || { id };
    console.log(pokemon);
    showModalPokemon(pokemon);
  }

});
modal.addEventListener('click', e => {
  const btnClose = e.target.closest('.btn-close');
  if (!btnClose) return;
  modal.classList.remove('d-flex');
  modal.classList.add('hidden');
});

favorites.addEventListener('click', e => {
  //e.preventDefault();
  currentView = 'favorites';
  let favoritesList = getFavorites();
  btnContainer.innerHTML = '';
  const searchBox = document.querySelector('.search-box');
  if (searchBox) searchBox.style.display = 'none';
  showFavorites(favoritesList);
});

async function loadMenuType() {
  /*fetch(urlType)
    .then(res => res.json())
    .then(data => renderPokemons(data.results))
    .catch(err => console.error(err));*/
  try {
    const res = await fetch(urlType);
    const data = await res.json();
    renderPokemons(data.results);
  } catch (error) {
    console.error('Error al cargar menu de tipos: ', error)
  }
}

function showFavorites(favorites) {

  if (favorites.length === 0) {
    containerPokemon.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 2rem; font-size: 1.5rem; position: absolute;">No hay favoritos</p>';
    return;
  }

  containerPokemon.innerHTML = '';
  favorites.forEach(pokemon => {
    let templateCardFavorite = generateTemplateCards(pokemon.id, pokemon.name, pokemon.img, pokemon.types);
    containerPokemon.insertAdjacentHTML("beforeend", templateCardFavorite);
  });
}
function addFavorite(pokemon) {
  if (existFavorite(pokemon.id)) {
    deleteFavorite(pokemon.id);
    return;
  }
  let favorites = getFavorites();
  localStorage.setItem('favorites', JSON.stringify([...favorites, pokemon]));

}
function existFavorite(id) {
  let favorites = getFavorites();
  return favorites.some(favorite => String(favorite.id) === String(id));
}
function deleteFavorite(id) {
  let favorites = getFavorites();
  favorites = favorites.filter(favorite => String(favorite.id) !== String(id));
  localStorage.setItem('favorites', JSON.stringify(favorites));

  if (currentView === 'favorites') {
    showFavorites(favorites);
  }
}
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('favorites')) ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getEvolutions(pokemon) {
  try {
    // 1. El parametro pokemon debe ser un objeto obtenido de este endpoint: fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    // 2. Obtener la cadena de evolución
    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    // 3. Extraer los nombres (Función recursiva simple)
    let evolutions = [];
    let currentStep = evoData.chain;

    while (currentStep) {
      evolutions.push(currentStep.species.name);
      currentStep = currentStep.evolves_to[0]; // condición de parada del bucle
    }

    console.log("Evoluciones:", evolutions);
    return evolutions;

  } catch (error) {
    console.error("Error al obtener evoluciones:", error);
    return [];
  }
}
async function showModalPokemon(pokemon) {
  // BLINDAJE: Si los datos están incompletos (procedentes de localStorage o cache vacío), descargamos el objeto completo
  if (!pokemon.stats || !pokemon.species) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
      pokemon = await res.json();
      // Guardamos en cache para que la próxima vez sea instantáneo
      pokemonCache.set(String(pokemon.id), pokemon);
    } catch (error) {
      console.warn("Modo offline: Cargando datos básicos.");
    }
  }

  // NO esperamos a las evoluciones para mostrar el modal
  const evolutionsPromise = getEvolutions(pokemon);

  const statLabels = {
    'hp': 'Vida',
    'attack': 'Ataque',
    'defense': 'Defensa',
    'special-attack': 'Ataque Especial',
    'special-defense': 'Defensa Especial',
    'speed': 'Velocidad'
  };

  let urlPokemon = null;
  if (pokemon.sprites.other?.dream_world?.front_default) {
    urlPokemon = pokemon.sprites.other.dream_world.front_default;
  } else if (pokemon.sprites.other?.["official-artwork"]?.front_default) {
    urlPokemon = pokemon.sprites.other["official-artwork"].front_default;
  } else if (pokemon.sprites.front_default) {
    urlPokemon = pokemon.sprites.front_default;
  } else if (pokemon.sprites.front_shiny) {
    urlPokemon = pokemon.sprites.front_shiny;
  }

  const typesHTML = pokemon.types
    .map(t => `<span class="card__type type-${t.type.name}">${t.type.name}</span>`)
    .join('');

  const statsHTML = pokemon.stats.map(s => {
    const label = statLabels[s.stat.name] || s.stat.name;
    const value = s.base_stat;
    const pct = Math.round((value / 255) * 100);
    let icon = '';
    let colorClass;
    if (value < 50) colorClass = 'low';
    else if (value < 80) colorClass = 'mid';
    else if (value < 120) colorClass = 'high';
    else colorClass = 'max';

    switch (s.stat.name) {
      case 'hp':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 512 512"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="#ef4444" d="M256 107.9L241 87.1C216 52.5 175.9 32 133.1 32 59.6 32 0 91.6 0 165.1l0 2.6c0 23.6 6.2 48 16.6 72.3l106 0c3.2 0 6.1-1.9 7.4-4.9l31.8-76.3c3.7-8.8 12.3-14.6 21.8-14.8s18.3 5.4 22.2 14.1l51.3 113.9 41.4-82.8c4.1-8.1 12.4-13.3 21.5-13.3s17.4 5.1 21.5 13.3l23.2 46.3c1.4 2.7 4.1 4.4 7.2 4.4l123.6 0c10.5-24.3 16.6-48.7 16.6-72.3l0-2.6C512 91.6 452.4 32 378.9 32 336.2 32 296 52.5 271 87.1l-15 20.7zM469.6 288l-97.8 0c-21.2 0-40.6-12-50.1-31l-1.7-3.4-42.5 85.1c-4.1 8.3-12.7 13.5-22 13.3s-17.6-5.7-21.4-14.1l-49.3-109.5-10.5 25.2c-8.7 20.9-29.1 34.5-51.7 34.5l-80.2 0c47.2 73.8 123 141.7 170.4 177.9 12.4 9.4 27.6 14.1 43.1 14.1s30.8-4.6 43.1-14.1C346.6 429.7 422.4 361.8 469.6 288z" /></svg>';
        break;
      case 'attack':
        icon = '<svg  xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0200f9" viewBox="0 0 24 24" ><!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free--><path d="M21 2h-5c-.3 0-.58.13-.77.37l-8.3 10.14L5 10.58V7.99H3v3c0 .27.11.52.29.71l3 3 .09.09-4.79 4.79 2.83 2.83 4.79-4.79.09.09 3 3c.19.19.44.29.71.29h3v-2h-2.59l-1.93-1.93 10.14-8.3c.23-.19.37-.47.37-.77V3c0-.55-.45-1-1-1m-1 5.53-9.93 8.13-1.72-1.72 8.13-9.93h3.53v3.53Z"></path></svg>';
        break;
      case 'defense':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 512 512"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="#c0c0c0" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0z"/></svg>';
        break;
      case 'special-attack':
        icon = '<svg  xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0200f9" viewBox="0 0 24 24" ><!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free--><path d="M21 2h-5c-.3 0-.58.13-.77.37l-8.3 10.14L5 10.58V7.99H3v3c0 .27.11.52.29.71l3 3 .09.09-4.79 4.79 2.83 2.83 4.79-4.79.09.09 3 3c.19.19.44.29.71.29h3v-2h-2.59l-1.93-1.93 10.14-8.3c.23-.19.37-.47.37-.77V3c0-.55-.45-1-1-1m-1 5.53-9.93 8.13-1.72-1.72 8.13-9.93h3.53v3.53Z"></path></svg><sub class="stat-sub">Esp</sub>'
        break;
      case 'special-defense':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 512 512"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path fill="#c0c0c0" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0z"/></svg><sub class="stat-sub">Esp</sub>'
        break;
      case 'speed':
        icon = '<svg  xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#7AC74C" viewBox="0 0 24 24" ><!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free--><path d="M17 2a2 2 0 1 0 0 4 2 2 0 1 0 0-4m-.35 9.46a2 2 0 0 0 1.52.7c.4 0 .81-.12 1.16-.38l2.76-1.97-1.16-1.63-2.76 1.97-1.96-2.28c-.43-.51-1.03-.86-1.69-.99l-3.65-.73c-.81-.16-1.65.2-2.09.9l-2.13 3.41 1.7 1.06 2.13-3.41 2.04.41L7.43 17H2v2h5.43c.7 0 1.36-.37 1.71-.97l1.92-3.2 5.14 1.03 1.83 6.41 1.92-.55-1.83-6.41a2 2 0 0 0-1.53-1.41l-3.01-.6 1.91-3.18 1.15 1.34Z"></path></svg>'
        break;
      default:
        break;
    }
    return `
      <div class="stat-row">
        <div class="stat-data">
          <span class="stat-icon">${icon}</span>
          <span class="stat-value">${value}</span>
          <span class="stat-name">${label}</span>
        </div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill ${colorClass}" style="width: 0%" data-width="${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  const template = `
    <div class="modal__content">
      <button aria-label="Cerrar" class="btn-close">
        <svg  xmlns="http://www.w3.org/2000/svg" width="48" height="48"  
          fill="#000000" viewBox="2 2 20 20" >
          <!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free-->
          <path d="M14.83 7.76 12 10.59 9.17 7.76 7.76 9.17 10.59 12l-2.83 2.83 1.41 1.41L12 13.41l2.83 2.83 1.41-1.41L13.41 12l2.83-2.83z"></path><path d="M12 2C9.33 2 6.82 3.04 4.93 4.93S2 9.33 2 12s1.04 5.18 2.93 7.07c1.95 1.95 4.51 2.92 7.07 2.92s5.12-.97 7.07-2.92S22 14.67 22 12s-1.04-5.18-2.93-7.07A9.93 9.93 0 0 0 12 2m5.66 15.66c-3.12 3.12-8.19 3.12-11.31 0-1.51-1.51-2.34-3.52-2.34-5.66s.83-4.15 2.34-5.66S9.87 4 12.01 4s4.15.83 5.66 2.34 2.34 3.52 2.34 5.66-.83 4.15-2.34 5.66Z"></path>
        </svg>
      </button>
      <div class="modal__header">
        <img src="${urlPokemon}" alt="imagen de ${pokemon.name}">
        <h3 class="text-capitalize text-center">${pokemon.name} <span class="card__id">#${pokemon.id}</span></h3>
        <div class="card__types" style="justify-content: center; margin-bottom: 1rem;">${typesHTML}</div>
      </div>
      <div class="modal__body">
        <div class="modal__stats">
          <h3 class="text-capitalize text-center margin-0">Estadísticas base</h3>
          ${statsHTML}
        </div>
        <div class="modal__evolutions">
          <h3 class="text-capitalize">Evoluciones</h3>
          <div class="modal__evolutions--flex">
            <p class="loading-text">Cargando evoluciones...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.innerHTML = '';
  modal.classList.remove('hidden');
  modal.classList.add('d-flex');
  modal.insertAdjacentHTML('beforeend', template);

  // Update evolutions when ready
  const currentId = pokemon.id;
  evolutionsPromise.then(evolutions => {
    // Verificar si el modal sigue abierto y es para el mismo pokemon
    const modalContent = document.querySelector('.modal__content');
    if (!modalContent) return;

    const headerId = modalContent.querySelector('.card__id')?.textContent;
    if (headerId !== `#${currentId}`) return;

    const evoContainer = modalContent.querySelector('.modal__evolutions--flex');
    if (evoContainer) {
      if (evolutions.length > 0) {
        evoContainer.innerHTML = evolutions.map(name => `
          <div class="evo-item">
              <img src="https://img.pokemondb.net/sprites/home/normal/${name}.png" width="128" height="128" alt="${name}">
              <p class="text-capitalize">${name}</p>
          </div>
        `).join(' <span class="evo-arrow">→</span> ');
      } else {
        evoContainer.innerHTML = '<p>No se encontraron evoluciones.</p>';
      }
    }
  });

  // Animación de las barras con anime.js
  requestAnimationFrame(() => {
    document.querySelectorAll('.stat-bar-fill').forEach((bar, i) => {
      anime({
        targets: bar,
        width: bar.dataset.width,
        duration: 600,
        delay: i * 80,
        easing: 'easeOutQuart'
      });
    });
  });
}

async function loadTypesPokemons(urlType) {
  /*showSpinner();
  fetch(urlType)
    .then(res => res.json())
    .then(data => {
      pokemonsByType = data.pokemon;
      currentPage = 0;

      renderTypePage();
    });*/
  try {
    const res = await fetch(urlType);
    const data = await res.json();
    pokemonsByType = data.pokemon;
    currentPage = 0;
    renderTypePage()
  } catch (error) {
    console.error(error)
  }
}
async function renderTypePage() {

  showSpinner();

  const start = currentPage * limit;
  const end = start + limit;
  const pagePokemons = pokemonsByType.slice(start, end);


  pagePokemons.forEach(({ pokemon }) => {
    fetch(pokemon.url)
      .then(res => res.json())
      .then(data => paintEveryPokemon(data));
  });

  renderTypeNavigation();

}
function renderTypeNavigation() {

  btnContainer.innerHTML = '';

  if (currentPage > 0) {
    btnContainer.insertAdjacentHTML(
      "beforeend",
      `<button class="btn-page" id="prev">⬅</button>`
    );
  }

  if ((currentPage + 1) * limit < pokemonsByType.length) {
    btnContainer.insertAdjacentHTML(
      "beforeend",
      `<button class="btn-page" id="next">➡</button>`
    );
  }

}
async function loadPokemons() {
  /*showSpinner();
  fetch(urlGeneral)
    .then(res => res.json())
    .then(data => {
      btnContainer.innerHTML = '';
      renderNavigation(data);
      twentyPokemons(data.results);
    })
    .catch(err => console.error("Error:", err));*/
  try {
    showSpinner();
    const res = await fetch(urlGeneral);
    const data = await res.json();
    btnContainer.innerHTML = '';
    renderNavigation(data);
    twentyPokemons(data.results);
  } catch (error) {
    console.log(error)
  }
}
async function loadAllPokemons() {
  /*fetch("https://pokeapi.co/api/v2/pokemon?limit=10000")
    .then(res => res.json())
    .then(data => {
      allPokemons = data.results;
    });*/
  try {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10000");
    const data = await res.json();
    allPokemons = data.results;
    console.log(allPokemons);
  } catch (error) {
    console.error(error);
  }

}
function searchPokemon(query) {
  if (!query) {
    loadPokemons();
    return;
  }
  btnContainer.innerHTML = '';
  const matches = allPokemons.filter(pokemon =>
    pokemon.name.startsWith(query.toLowerCase())
  );

  showSearchResults(matches.slice(0, 20));
}
function showSearchResults(pokemons) {
  showSpinner();

  pokemons.forEach(pokemon => {
    fetch(pokemon.url)
      .then(res => {
        if (!res.ok) throw new Error('Sin conexión');
        return res.json();
      })
      .then(data => paintEveryPokemon(data))
      .catch(err => console.warn('Pokémon no disponible offline:', pokemon.url, err));
  });
}

function twentyPokemons(pokemons) {
  showSpinner();
  Promise.allSettled(pokemons.map(p => fetch(p.url).then(res => res.json())))
    .then(results => {
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          paintEveryPokemon(result.value);
        } else {
          console.error("Error al cargar un Pokémon:", result.reason);
        }
      });
    });
}

function paintEveryPokemon(pokemon) {
  pokemonCache.set(String(pokemon.id), pokemon)
  // Buscar imagen con múltiples fallbacks
  let urlPokemon = null;

  if (pokemon.sprites.other?.dream_world?.front_default) {
    urlPokemon = pokemon.sprites.other.dream_world.front_default;
  } else if (pokemon.sprites.other?.["official-artwork"]?.front_default) {
    urlPokemon = pokemon.sprites.other["official-artwork"].front_default;
  } else if (pokemon.sprites.front_default) {
    urlPokemon = pokemon.sprites.front_default;
  } else if (pokemon.sprites.front_shiny) {
    urlPokemon = pokemon.sprites.front_shiny;
  }

  // Si no hay imagen, no renderizar la tarjeta
  if (!urlPokemon) return;

  const spinner = document.querySelector('.sk-cube-grid');
  if (spinner) {
    spinner.remove();
  }

  const templateCard = generateTemplateCards(pokemon.id, pokemon.name, urlPokemon, pokemon.types);

  containerPokemon.insertAdjacentHTML("beforeend", templateCard);
}
function generateTemplateCards(id, name, urlImg, types) {
  // NORMALIZACIÓN: Si types es un string (favoritos), lo convertimos en array.
  // Si ya es un array (API), lo dejamos como está.
  const typesArray = typeof types === 'string' ? types.split(',') : types;
  console.log(typeof id)
  return `
    <div class="card" data-card-id="${id}">
      <div class="card__img-container">
        <button class="btn-favorite" aria-label="Agregar a favoritos" data-id="${id}" data-name="${name}" data-img="${urlImg}" data-types="${typeof types === 'string' ? types : types.map(t => t.type.name).join(',')}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="${existFavorite(id) ? '#EF4444' : '#000000'}" viewBox="0 0 512 512">
            <!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
            <path  d="M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z"/>
          </svg>
        </button>
        <img src="${urlImg}" alt="imagen de ${name}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <h2 class="text-capitalize">${name} <span class="card__id">#${id}</span></h2>
      <div class="card__types">
        ${typesArray.map(type => {
    // Si es un objeto de la API usamos type.type.name, si es de favoritos usamos el string directo
    const typeName = typeof type === 'string' ? type : type.type.name;
    return `<span class="card__type type-${typeName}">${typeName}</span>`;
  }).join('')}
      </div>
    </div>
  `;
}

function animatePageChange(callback) {
  anime({
    targets: '.container-pokemon',
    opacity: 0,
    translateX: -40,
    duration: 500,
    easing: 'easeInQuad',
    complete: () => {
      callback();

      anime({
        targets: '.container-pokemon',
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 1500,
        easing: 'easeOutQuad'
      });
    }
  });
}

function renderNavigation(orderNavigation) {
  btnPrev = orderNavigation.previous ? `<button aria-label="Cargar lista anterior de pokemon" class="btn-page" data-page=${orderNavigation.previous}>⬅</button>` : '';
  btnNext = orderNavigation.next ? `<button aria-label="Cargar la proxima lista de pokemon" class="btn-page" data-page=${orderNavigation.next}>➡</button>` : '';
  btnContainer.insertAdjacentHTML('afterbegin', btnPrev);
  btnContainer.insertAdjacentHTML('beforeend', btnNext);
}
function renderPokemons(types) {
  types.forEach(type => {
    let template = `
      <li role="menuitem" class="dropdown__li">
        <button class="btn btn-full dropdown__anchor" data-type="${type.name}">${type.name}</button>
      </li>
    `;
    menuTypes.insertAdjacentHTML('beforeend', template)
  })
}
function showSpinner() {
  containerPokemon.innerHTML = '';

  // Limpiar cualquier spinner viejo que haya quedado colgado en el contenedor principal
  const oldSpinner = document.querySelector('.sk-cube-grid');
  if (oldSpinner) oldSpinner.remove();

  const spinner = document.createElement('div');
  spinner.classList.add('sk-cube-grid');
  spinner.innerHTML = `
    <div class="sk-cube sk-cube1"></div>
    <div class="sk-cube sk-cube2"></div>
    <div class="sk-cube sk-cube3"></div>
    <div class="sk-cube sk-cube4"></div>
    <div class="sk-cube sk-cube5"></div>
    <div class="sk-cube sk-cube6"></div>
    <div class="sk-cube sk-cube7"></div>
    <div class="sk-cube sk-cube8"></div>
    <div class="sk-cube sk-cube9"></div>
  `;
  container.appendChild(spinner);
}