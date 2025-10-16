class queryProducts {
  products = []
  query = {}
  constructor(products, query) {
    this.products = products
    this.query = query
  }
  categoryQuery = () => {
    this.products = this.query.category ? this.products.filter(c => c.category === this.query.category) : this.products
    return this
  }
  ratingQuery = () => {
    const r = parseInt(this.query.rating, 10);
    if (!Number.isNaN(r)) {
      this.products = this.products.filter(c => Number(c.rating || 0) >= r && Number(c.rating || 0) < r + 1);
    }
    return this;
  }

  priceQuery = () => {
    const low = Number(this.query.lowPrice);
    const high = Number(this.query.highPrice);
    if (!Number.isNaN(low) && !Number.isNaN(high)) {
      this.products = this.products.filter(p => Number(p.price || 0) >= low && Number(p.price || 0) <= high);
    }
    return this;
  }

  skip = () => {
    const page = parseInt(this.query.pageNumber, 10) || 1;
    const per = parseInt(this.query.perPage, 10) || 12;
    const start = (page - 1) * per;
    this.products = this.products.slice(start); // সহজ ও নিরাপদ
    return this;
  }

  limit = () => {
    const per = parseInt(this.query.perPage, 10) || 12;
    this.products = this.products.slice(0, per);
    return this;
  }
  searchValue = () => {
    this.products = this.query.searchValue ? this.products.filter(p => p.name.toUpperCase().indexOf(this.query.searchValue.toUpperCase()) > -1) : this.products
    return this
  }
  sortByPrice = () => {
    if (this.query.sortPrice) {
      if (this.query.sortPrice === 'low-to-high') {
        this.products = this.products.sort(function (a, b) { return a.price - b.price })
      } else {
        this.products = this.products.sort(function (a, b) { return b.price - a.price })
      }
    }
    return this
  }

  getProducts = () => {
    return this.products
  }
  countProducts = () => {
    return this.products.length
  }
  
  sellerQuery() {
    const { sellerId, shopName } = this.query;
    let list = this.data;
    if (sellerId) list = list.filter(p => String(p.sellerId) === String(sellerId));
    else if (shopName) list = list.filter(p => String(p.shopName || '').toLowerCase() === String(shopName).toLowerCase());
    this.data = list;
    return this;
  }
}
module.exports = queryProducts