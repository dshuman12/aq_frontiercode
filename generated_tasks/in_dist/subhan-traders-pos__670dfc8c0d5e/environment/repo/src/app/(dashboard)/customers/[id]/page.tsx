import { getCustomerById } from "@/lib/data/customers";
import { notFound } from "next/navigation";
import { CustomerDetailsClient } from "@/components/customers/CustomerDetailsClient";

export default async function CustomerDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const initialCustomer = await getCustomerById(id);

    if (!initialCustomer) {
        notFound();
    }

    return (
        <CustomerDetailsClient
            customerId={id}
            initialCustomer={initialCustomer as any} // we will type this properly in the client component
        />
    );
}
