PROPARTES,CONSULTA_ITEM_ML
<xsd:element minOccurs="1" maxOccurs="1" name="referencia" type="xsd:string" />
/#
-- Centro de costo de venta de un item, para la linea del pedido (f431_id_ccosto_movto).
-- @referencia: SKU de Mercado Libre (= f120_referencia). Solo lectura.
-- Mismo camino que CONSULTA_PRODUCTOS_ECOMMERCE_B2B:
-- item > tipo de inventario > equivalencia contable (concepto 0501, motivo 01) > centro de costo.
-- El LEFT JOIN distingue "el item no existe" de "existe pero sin equivalencia contable".
SELECT
    items.f120_id                       AS item_id,
    LTRIM(RTRIM(items.f120_referencia)) AS referencia,
    LTRIM(RTRIM(items.f120_descripcion)) AS descripcion,
    items.f120_ind_venta                AS ind_venta,
    LTRIM(RTRIM(cc.f284_id))            AS ccosto_venta
FROM dbo.t120_mc_items items
LEFT JOIN t193_mc_equiv_contab_varios equiv
       ON equiv.f193_id_tipo_inv_serv = items.f120_id_tipo_inv_serv
      AND equiv.f193_id_concepto      = '0501'
      AND equiv.f193_id_motivo        = '01'
LEFT JOIN t284_co_ccosto cc
       ON cc.f284_rowid = equiv.f193_rowid_ccosto_venta
WHERE LTRIM(RTRIM(items.f120_referencia)) = LTRIM(RTRIM(@referencia))
