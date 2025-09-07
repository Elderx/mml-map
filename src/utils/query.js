export function getQueryParams() {
  const params = {};
  window.location.search.replace(/\??([^=&]+)=([^&]*)/g, function(_, k, v) {
    params[k] = decodeURIComponent(v);
  });
  return params;
}


