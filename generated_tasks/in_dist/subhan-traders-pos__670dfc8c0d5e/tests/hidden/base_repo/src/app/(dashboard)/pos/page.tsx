import { POSCart } from "@/components/pos/Cart";
import { PaymentPanel } from "@/components/pos/PaymentPanel";
import { ProductSearch } from "@/components/pos/ProductSearch";

export default async function POSPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-4 md:-m-6 lg:-m-8">
      {/* Two-column layout — fills remaining viewport exactly */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 min-h-0">

        {/* LEFT — Product search + grid (contained scroll) */}
        <div className="lg:col-span-7 overflow-y-auto scrollbar-thin p-4">
          <ProductSearch />
        </div>

        {/* RIGHT — Cart + Payment (flex column, cart scrolls internally) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 border-s border-border/50 p-4 gap-3">
          <POSCart />
          <PaymentPanel />
        </div>

      </div>
    </div>
  );
}
