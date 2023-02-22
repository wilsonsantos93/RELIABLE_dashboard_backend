const DTConfig = () => {
    return { 
        columnDefs: [ 
            {
                defaultContent: "-",
                targets: "_all",
            }, 
            /* {
                targets: -1,
                render: function (data, type, row, meta) {
                    return `<div>
                            <button class="btn btn-secondary btn-block" onclick=viewFromID(${meta.row})>
                                <i class="fa fa-search"></i>
                            </button>

                            <button class="btn btn-danger" onclick=delFromID("${row._id}")>
                                <i class="fa fa-trash-o"></i>
                            </button>
                        </div>
                    `;
                }
            } */
        ],
        responsive: true,
        processing: true,
        serverSide: true,
        ordering: false,
        ajax: {
            type: "GET",
            url: null,
            dataSrc: 'data'
        },
        columns: null,
        getFieldsUrl: null
    }
};

class MyDatatable {
    selectors = {
        table: "#table",
        successAlert: ".alert-success",
        errorAlert: ".alert-danger",
        select: "#select",
        inputSelect: "#input-select",
        modal: "#modal",
        modalTitle: ".modal-title",
        modalBody: ".modal-body",
        modalConfirmBtn: "#modal-confirm-btn"
    }

    constructor(dtConfig, selectors) {
        this.dtConfig = dtConfig;
        this.selectors = { ...this.selectors, ...selectors }
        this.initDT();
    }

    // Init datatable
    initDT() {
        let columns = [];
        $.ajax({
            url: this.dtConfig.getFieldsUrl,
            success: (data) => {
                for (const colName of data){
                    columns.push({
                        title: colName,
                        data: colName, 
                        name: colName,
                        className: colName == "date" ? 'all' : 'ctrl'
                    });
                    $(this.selectors.select).append(`<option value="${colName}">${colName}</option>`);
                } 

                // Actions column
                columns.push({
                    title: null,
                    data: null, 
                    name: null,
                    className: "all"
                });

                this.dtConfig.columns = columns;
                $(this.selectors.table).DataTable(this.dtConfig);
            }
        });
        this.initSearchBox();
    }

    getDT() {
        return $(this.selectors.table).DataTable();
    }

    // Initialize search box
    initSearchBox() {
        $(this.selectors.inputSelect).val("");
        $(this.selectors.inputSelect).on('keyup', e => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                $(this.selectors.table).DataTable().columns().search("");
                const colName = $(this.selectors.select).val();
                const val = e.target.value;
                const column = $(this.selectors.table).DataTable().column(`${colName}:name`);
                column.search(val).draw();
            }
        });
    }

    // Set modal data (title + body)
    setModalData(title, body) {
        $(this.selectors.modalTitle).text(title);
        $(this.selectors.modalBody).html(body);
    }

    // Open deletion modal
    openDeleteModal() {
        $(this.selectors.modalConfirmBtn).addClass("btn-danger").removeClass("btn-primary");
        $(this.selectors.modalConfirmBtn).text("Eliminar");
        $(this.selectors.modal).modal('show');
    }

    // View item popup modal
    viewFromID(index) {
        $(this.selectors.modalConfirmBtn).hide()
        const data = $(this.selectors.table).DataTable().row(index).data();
        const title = `Item: ${data._id}`;
        const body = `<pre>${JSON.stringify(data, undefined, 2)}</pre>`;
        this.setModalData(title, body);
        $(this.selectors.modal).modal('show');
    }

    // Delete all popup modal
    deleteAllConfirm() {
        const title = `Eliminar tudo`;
        const body = `Tem a certeza que pretende eliminar todos os itens?`;
        this.setModalData(title, body);
        this.openDeleteModal();
        $(this.selectors.modalConfirmBtn).on("click", function(){ $("#formDeleteAll").submit() });
    }

    // Delete item popup modal
    delFromID(id, url) {
        const title = `Eliminar item`;
        const body = `Tem a certeza que pretende eliminar o item <strong>${id}</strong>?`;
        this.setModalData(title, body);
        $(this.selectors.modalConfirmBtn).show();
        $(this.selectors.modalConfirmBtn).on("click", () => { this.deleteItem(url); });
        this.openDeleteModal();
    }

    // Http request to delete item
    deleteItem(url) {
        $.post(url, (data, status) => {
            $(this.selectors.table).DataTable().ajax.reload();
            showSuccessAlert("Item eliminado com sucesso!");
        }).fail(e => {
            showErrorAlert(e.responseJSON);
        });
        $(this.selectors.modal).modal('hide');
    }
}