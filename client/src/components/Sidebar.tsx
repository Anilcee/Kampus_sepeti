import type { Category } from "@shared/schema";

interface SidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function Sidebar({ categories, selectedCategory, onCategoryChange }: SidebarProps) {
  const parentCategories = categories.filter(cat => !cat.parentId);
  const childCategories = categories.filter(cat => cat.parentId);

  const getCategoryChildren = (parentId: string) => {
    return childCategories.filter(cat => cat.parentId === parentId);
  };

  return (
    <aside className="w-64 bg-white rounded-lg shadow-md p-6 h-fit sticky top-24">
      <h2 className="font-bold text-lg text-gray-800 mb-4 border-b border-gray-200 pb-2">
        <i className="fas fa-filter mr-2 text-primary"></i>Kategoriler
      </h2>
      
      {/* Categories */}
      <nav className="space-y-2">
        <div className="mb-4">
          <button
            onClick={() => onCategoryChange("")}
            className={`block w-full text-left font-semibold hover:bg-blue-50 px-3 py-2 rounded-md transition-colors ${
              !selectedCategory ? "text-primary bg-blue-50" : "text-gray-700"
            }`}
            data-testid="button-all-products"
          >
            <i className="fas fa-book mr-2"></i>Tüm Ürünler
          </button>
        </div>
        
        {parentCategories.map((parentCategory) => {
          const children = getCategoryChildren(parentCategory.id);
          const isSelected = selectedCategory === parentCategory.id;
          const hasSelectedChild = children.some(child => child.id === selectedCategory);
          
          return (
            <div key={parentCategory.id} className="mb-3">
              <button
                onClick={() => onCategoryChange(parentCategory.id)}
                className={`block w-full text-left font-semibold mb-2 px-2 py-2 rounded transition-colors ${
                  isSelected || hasSelectedChild 
                    ? "text-primary bg-blue-50" 
                    : "text-gray-700 hover:text-primary hover:bg-gray-50"
                }`}
                data-testid={`button-category-${parentCategory.slug}`}
              >
                {parentCategory.name}
              </button>
              
              {children.length > 0 && (
                <div className="ml-4 space-y-1">
                  {children.map((childCategory) => (
                    <button
                      key={childCategory.id}
                      onClick={() => onCategoryChange(childCategory.id)}
                      className={`block w-full text-left px-2 py-1 rounded transition-colors text-sm ${
                        selectedCategory === childCategory.id
                          ? "text-primary bg-blue-50 font-medium"
                          : "text-gray-600 hover:text-primary hover:bg-gray-50"
                      }`}
                      data-testid={`button-category-${childCategory.slug}`}
                    >
                      {childCategory.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Price Filter */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-3">
          <i className="fas fa-lira-sign mr-2 text-primary"></i>Fiyat Aralığı
        </h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-primary" data-testid="checkbox-price-0-5000" />
            <label className="ml-2 text-sm text-gray-600">0 - 5,000 TL</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-primary" data-testid="checkbox-price-5000-15000" />
            <label className="ml-2 text-sm text-gray-600">5,000 - 15,000 TL</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-primary" data-testid="checkbox-price-15000-plus" />
            <label className="ml-2 text-sm text-gray-600">15,000 TL üzeri</label>
          </div>
        </div>
      </div>
    </aside>
  );
}
