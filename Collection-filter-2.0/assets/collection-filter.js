/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 * Alternatives
 * - Accounting.js - http://openexchangerates.github.io/accounting.js/
 *
 */

theme.Currency = (function() {
  var moneyFormat = '${{amount}}'; // eslint-disable-line camelcase

  function formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number === null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        '$1' + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : '';

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'");
        break;
    }

    return formatString.replace(placeholderRegex, value);
  }

  return {
    formatMoney: formatMoney
  };
})();
/*Common functions*/
 
function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.focus();
}
 

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

const serializeForm = form => {
    const obj = {};
    const formData = new FormData(form);

    for (const key of formData.keys()) {
        const regex = /(?:^(properties\[))(.*?)(?:\]$)/;

        if (regex.test(key)) {
            obj.properties = obj.properties || {};
            obj.properties[regex.exec(key)[2]] = formData.get(key);
        } else {
            obj[key] = formData.get(key);
        }
    }

    return JSON.stringify(obj);
};

function fetchConfig(type = 'json') {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': `application/${type}`
        }
    };
}
 


class CollectionFiltersForm extends HTMLElement {
    constructor() {
        super();
        this.filterData = [];
        this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

        this.debouncedOnSubmit = debounce((event) => {
            this.onSubmitHandler(event);
        }, 500);

        this.querySelector('form').addEventListener('input', this.debouncedOnSubmit.bind(this));
        window.addEventListener('popstate', this.onHistoryChange.bind(this));

    }



    onSubmitHandler(event) {
        event.preventDefault();
        const formData = new FormData(event.target.closest('form'));
        const searchParams = new URLSearchParams(formData).toString();
        this.renderPage(searchParams, event);
        //console.log('ready', searchParams)
    }
    onActiveFilterClick(event) {
        event.preventDefault();
        this.toggleActiveFacets();
        this.renderPage(new URL(event.currentTarget.href).searchParams.toString());
    }

    onHistoryChange(event) {
        const searchParams = event.state ? event.state.searchParams : '';
        this.renderPage(searchParams, null, false);
    }

    toggleActiveFacets(disable = true) {
        document.querySelectorAll('.js-facet-remove').forEach((element) => {
            element.classList.toggle('disabled', disable);
        });
    }

    renderPage(searchParams, event, updateURLHash = true) {
        const sections = this.getSections();
        const countContainerDesktop = document.getElementById('CollectionWrap');
        document.getElementById('CollectionWrap').querySelector('#product-grid').classList.add('loading');
        document.getElementById('CollectionProductCount').classList.add('loading');
        if (countContainerDesktop) {
            countContainerDesktop.classList.add('loading');
        }

        sections.forEach((section) => {
            const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
            const filterDataUrl = element => element.url === url;

            this.filterData.some(filterDataUrl) ?
                this.renderSectionFromCache(filterDataUrl, event) :
                this.renderSectionFromFetch(url, event);
        });

        if (updateURLHash) this.updateURLHash(searchParams);
    }

    renderSectionFromFetch(url, event) {
        fetch(url)
            .then(response => response.text())
            .then((responseText) => {
                const html = responseText;
                this.filterData = [...this.filterData, {
                    html,
                    url
                }];
                this.renderFilters(html, event);
                this.renderProductGrid(html);
                this.renderProductCount(html);
            });
    }

    renderSectionFromCache(filterDataUrl, event) {
        const html = this.filterData.find(filterDataUrl).html;
        this.renderFilters(html, event);
        this.renderProductGrid(html);
        this.renderProductCount(html);
    }

    renderProductGrid(html) {
        document.getElementById('product-grid').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('product-grid').innerHTML;
    }

    renderProductCount(html) {
        const count = new DOMParser().parseFromString(html, 'text/html').getElementById('CollectionProductCount').innerHTML
        const container = document.getElementById('CollectionProductCount');
        const containerDesktop = document.getElementById('CollectionProductCountDesktop');
        container.innerHTML = count;
        container.classList.remove('loading');
        if (containerDesktop) {
            containerDesktop.innerHTML = count;
            containerDesktop.classList.remove('loading');
        }
        document.getElementById('CollectionWrap').classList.remove('loading');
        document.querySelector('.collection_wrap').classList.remove('loading');
    }
    
    renderFilters(html, event) {
        const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

        const facetDetailsElements =
            parsedHTML.querySelectorAll('#DesktopFilter .js-filter');
        const matchesIndex = (element) => {
            const jsFilter = event ? event.target.closest('.js-filter') : undefined;
            return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
        }
        const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
        const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);


        facetsToRender.forEach((element) => {
            document.querySelector(`.desktop-fil.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
        });

        //only for mobile 
        const Mobile_facetDetailsElements =
            parsedHTML.querySelectorAll('#MobileFilter .js-filter');
        const Mobile_matchesIndex = (element) => {
            const Mobile_jsFilter = event ? event.target.closest('.js-filter') : undefined;
            return Mobile_jsFilter ? element.dataset.index === Mobile_jsFilter.dataset.index : false;
        }
        const Mobile_facetsToRender = Array.from(Mobile_facetDetailsElements).filter(element => !Mobile_matchesIndex(element));
        const Mobile_countsToRender = Array.from(Mobile_facetDetailsElements).find(Mobile_matchesIndex);
        
        Mobile_facetsToRender.forEach((element) => {
            document.querySelector(`.mobile-fil.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
        });
       
       

        this.renderActiveFacets(parsedHTML);
        this.renderAdditionalElements(parsedHTML);


        if (countsToRender) this.renderCounts(countsToRender, event.target.closest('.js-filter'));
        //only for mobile
        if (Mobile_countsToRender) this.renderCounts(Mobile_countsToRender, event.target.closest('.js-filter'));

    }

    renderActiveFacets(html) {
        const activeFacetElementSelectors = ['.active-filters-mobile', '.active-filters-desktop', '.clear-button-mobile', '.clear-button-desktop'];

        activeFacetElementSelectors.forEach((selector) => {
          const activeFacetsElement = html.querySelector(selector);
          if (!activeFacetsElement) return;
          document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
        })

        this.toggleActiveFacets(false);

        
    }

    renderAdditionalElements(html) {
        const mobileElementSelectors = ['.mobile-filter-button'];

        mobileElementSelectors.forEach((selector) => {
          if (!html.querySelector(selector)) return;
          document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
        });

        document.getElementById('MobileFilterForm').closest('custom-menu-drawer').bindEvents();
    }


    renderCounts(source, target) {
    const countElementSelectors = ['.facets__selected_desktop','.facets__selected_mobile'];
    countElementSelectors.forEach((selector) => {
      const targetElement = target.querySelector(selector);
      const sourceElement = source.querySelector(selector);

      if (sourceElement && targetElement) {
        target.querySelector(selector).outerHTML = source.querySelector(selector).outerHTML;
        //

        const count = target.querySelector(selector).innerHTML;
        var matches = count.replace(/\(|\)/g, '');
        var matches = matches.trim();

        //console.log(matches)

        if (matches > 0) {
            target.querySelector(selector).classList.add('display');
        }else{
            target.querySelector(selector).classList.remove('display');
        }


      }
    });
  }


    updateURLHash(searchParams) {
        history.pushState({
            searchParams
        }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }

    //Add Class
    getSections() {
        return [{
            id: 'product-grid',
            section: document.getElementById('product-grid').dataset.id,
        }]
    }
}
customElements.define('collection-filters', CollectionFiltersForm);


// class PriceRange extends HTMLElement {
//   constructor() {
//     super();
//     this.querySelectorAll('input')
//       .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));

//     this.setMinAndMaxValues();
//   }

//   onRangeChange(event) {
//     this.adjustToValidValues(event.currentTarget);
//     this.setMinAndMaxValues();
//   }

//   setMinAndMaxValues() {
//     const inputs = this.querySelectorAll('input');
//     const minInput = inputs[0];
//     const maxInput = inputs[1];
//     if (maxInput.value) minInput.setAttribute('max', maxInput.value);
//     if (minInput.value) maxInput.setAttribute('min', minInput.value);
//     if (minInput.value === '') maxInput.setAttribute('min', 0);
//     if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
//   }

//   adjustToValidValues(input) {
//     const value = Number(input.value);
//     const min = Number(input.getAttribute('min'));
//     const max = Number(input.getAttribute('max'));

//     if (value < min) input.value = min;
//     if (value > max) input.value = max;
//   }
// }

//customElements.define('price-range', PriceRange);

class CustomFacetRemove extends HTMLElement {
  constructor() {
    super();
    this.querySelector('a').addEventListener('click', (event) => {
      event.preventDefault();
 
      const form = document.querySelector('collection-filters');
      form.onActiveFilterClick(event);
    });
  }
}

customElements.define('custom-facet-remove', CustomFacetRemove);

class PriceRanges extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input')
      .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));

    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    //this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const label = this.querySelectorAll('label');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    //main input

    const lowerSlider = inputs[2];
    const upperSlider = inputs[3];
    //console.log(lowerSlider, upperSlider

    const label1 = label[0].querySelectorAll('#price_lower_val');
    const label2 = label[1].querySelectorAll('#price_upper_val');

    const lowerSliderText = label1;
    const upperSliderText = label2;

    //console.log(lowerSliderText, upperSliderText)


     lowerSlider.addEventListener('input', LowerSliderFunction);
     upperSlider.addEventListener('input', UpperSliderFunction);

    
  }


}
function LowerSliderFunction (e) {
    const values = e.target.value;
    document.querySelector('.desktop-filter #price_lower_val').innerHTML = theme.Currency.formatMoney(values * 100);
    document.querySelector('.desktop-filter .update_min_price').value = values;

    document.querySelector('#MobileFilterForm #price_lower_val').innerHTML = theme.Currency.formatMoney(values * 100);
    document.querySelector('#MobileFilterForm .update_min_price').value = values;
}
function UpperSliderFunction (e) {
    const values = e.target.value;

    document.querySelector('.desktop-filter #price_upper_val').innerHTML = theme.Currency.formatMoney(values * 100);
    document.querySelector('.desktop-filter .update_max_price').value = values;

    document.querySelector('#MobileFilterForm #price_upper_val').innerHTML = theme.Currency.formatMoney(values * 100);
    document.querySelector('#MobileFilterForm .update_max_price').value= values;
}

customElements.define('price-ranges', PriceRanges);
  
// var Desktop_lowerSlider = document.querySelector('.desktop-filter .price_lower');
// var Desktop_upperSlider = document.querySelector('.desktop-filter .price_upper');
 
// if (Desktop_lowerSlider) {
//     var Desktop_lowerVal = parseFloat(Desktop_lowerSlider.value);
//     var Desktop_upperVal = parseFloat(Desktop_upperSlider.value);

//     Desktop_lowerSlider.oninput = function () {
        
//         if (Desktop_lowerVal > Desktop_upperVal - 10) {
//             Desktop_upperSlider.value = Desktop_lowerVal + 10;
//             if (Desktop_upperVal == Desktop_upperSlider.max) {
//                 Desktop_lowerSlider.value = parseFloat(Desktop_upperSlider.max) - 10;
//             }
//         }
//         document.querySelector('.desktop-filter #price_lower_val').innerHTML=theme.Currency.formatMoney(this.value * 100);
//         document.querySelector('.desktop-filter .update_min_price').value=this.value;
//     };

//     Desktop_upperSlider.oninput = function () {
//         if (Desktop_upperVal < Desktop_lowerVal + 10) {
//             Desktop_upperSlider.value = Desktop_upperVal - 10;
//             if (Desktop_lowerVal == Desktop_upperSlider.min) {
//             Desktop_upperSlider.value = 10;
//             }
//         }
//         document.querySelector('.desktop-filter #price_upper_val').innerHTML=theme.Currency.formatMoney(this.value * 100);
//         document.querySelector('.desktop-filter .update_max_price').value=this.value;
//     };
// }


// var Mobile_lowerSlider = document.querySelector('.mobile-filter .price_lower');
// var Mobile_upperSlider = document.querySelector('.mobile-filter .price_upper');
 
// if (Mobile_lowerSlider) {
//     var Mobile_lowerVal = parseFloat(Mobile_lowerSlider.value);
//     var Mobile_upperVal = parseFloat(Mobile_upperSlider.value);

//     Mobile_lowerSlider.oninput = function () {
        
//         if (Mobile_lowerVal > Mobile_upperVal - 10) {
//             Mobile_upperSlider.value = Mobile_lowerVal + 10;
//             if (Mobile_upperVal == Mobile_upperSlider.max) {
//                 Mobile_lowerSlider.value = parseFloat(Mobile_upperSlider.max) - 10;
//             }
//         }
//         document.querySelector('.mobile-filter #price_lower_val').innerHTML=theme.Currency.formatMoney(this.value * 100);
//         document.querySelector('.mobile-filter .update_min_price').value=this.value;
//     };

//     Mobile_upperSlider.oninput = function () {
//         if (Mobile_upperVal < Mobile_lowerVal + 10) {
//             Mobile_upperSlider.value = Mobile_upperVal - 10;
//             if (Mobile_lowerVal == Mobile_upperSlider.min) {
//             Mobile_upperSlider.value = 10;
//             }
//         }
//         document.querySelector('.mobile-filter #price_upper_val').innerHTML=theme.Currency.formatMoney(this.value * 100);
//         document.querySelector('.mobile-filter .update_max_price').value=this.value;
//     };
// }

class CustomMenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');
    const summaryElements = this.querySelectorAll('summary');
    this.addAccessibilityAttributes(summaryElements);

    if (navigator.platform === 'iPhone') document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll('button').forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  addAccessibilityAttributes(summaryElements) {
    summaryElements.forEach(element => {
      element.setAttribute('role', 'button');
      element.setAttribute('aria-expanded', false);
      element.setAttribute('aria-controls', element.nextElementSibling.id);
    });
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const isOpen = detailsElement.hasAttribute('open');

    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(summaryElement) : this.openMenuDrawer(summaryElement);
    } else {
        console.log(summaryElement.nextElementSibling, detailsElement)
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
      });
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    document.body.classList.add(`overflow-hidden`);
    document.querySelector('html').classList.add(`overflow-hidden`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event !== undefined) {
      this.mainDetailsToggle.classList.remove('menu-opening');
      this.mainDetailsToggle.querySelectorAll('details').forEach(details =>  {
        details.removeAttribute('open');
        details.classList.remove('menu-opening');
      });
      this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
      document.body.classList.remove(`overflow-hidden`);
      document.querySelector('html').classList.remove(`overflow-hidden`);
      this.closeAnimation(this.mainDetailsToggle);
    }
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    detailsElement.classList.remove('menu-opening');
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('custom-menu-drawer', CustomMenuDrawer);

//Outside click
const mobileClose = document.getElementById('mobile-filte-click');
mobileClose.addEventListener('click', function (event) {
  event.preventDefault();
  event.stopPropagation();
  document.querySelector('custom-menu-drawer summary').click();
});
const mobileCloseIcon = document.getElementById('filter-close-icon');
mobileCloseIcon.addEventListener('click', function (event) {
  event.preventDefault();
  event.stopPropagation();
  document.querySelector('custom-menu-drawer summary').click();
});
