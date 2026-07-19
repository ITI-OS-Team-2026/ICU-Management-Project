-- CreateTable
CREATE TABLE "public"."investigation_orders" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "ordered_by" TEXT NOT NULL,
    "order_name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investigation_orders_admission_id_idx" ON "public"."investigation_orders"("admission_id");

-- CreateIndex
CREATE INDEX "investigation_orders_ordered_by_idx" ON "public"."investigation_orders"("ordered_by");

-- CreateIndex
CREATE INDEX "investigation_orders_status_idx" ON "public"."investigation_orders"("status");

-- AddForeignKey
ALTER TABLE "public"."investigation_orders" ADD CONSTRAINT "investigation_orders_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."investigation_orders" ADD CONSTRAINT "investigation_orders_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
