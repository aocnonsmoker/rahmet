describe('Membership multi-group', () => {
  it('full flow', () => {
    cy.viewport(1440, 900);

    cy.visit('/login');
    cy.get('input[placeholder="например rahmet"]').type('ui-test');
    cy.get('input[placeholder="Логин сотрудника"]').type('tester');
    cy.get('input[placeholder="Пароль"]').type('test1234');
    cy.contains('Войти').click();
    cy.url({ timeout: 10000 }).should('include', '/tabs/');

    cy.visit('/tabs/urban-sport');
    cy.contains('.tab-btn', 'Клиенты', { timeout: 10000 }).should('be.visible').click();
    cy.contains('.record-card', '+77777771233', { timeout: 10000 }).should('be.visible');
    cy.screenshot('01-clients-before');

    // existing membership already has "Айкидо" — edit it and add "Каратэ" too
    cy.contains('.record-card', '+77777771233').click();
    cy.contains('.ff-label', 'Группы').parent().find('.ff-trigger').click();
    cy.get('.ff-dropdown').contains('.ff-option', 'Айкидо').should('have.class', 'is-selected');
    cy.get('.ff-dropdown').contains('.ff-option', 'Каратэ').click();
    cy.get('.ff-dropdown').contains('.ff-option', 'Каратэ').should('have.class', 'is-selected');
    // dropdown should stay open after a multi-select click
    cy.get('.ff-dropdown').should('be.visible');
    cy.screenshot('02-multiselect-open');
    cy.get('body').click(10, 10); // close dropdown
    cy.contains('.ff-trigger', 'Айкидо').should('contain.text', 'Каратэ');
    cy.contains('button', 'Сохранить').click();
    cy.contains('.record-card', '+77777771233').should('contain.text', 'Айкидо').and('contain.text', 'Каратэ');
    cy.screenshot('03-after-save-two-groups');

    // brand new client with two groups selected from the start
    cy.contains('button', '+ Добавить клиента').click();
    cy.contains('.ff-label', 'ФИО').parent().find('input').type('Тест Мультигруппа');
    cy.contains('.ff-label', 'Телефон').parent().find('input').clear().type('+77001112233');
    cy.contains('.ff-label', 'Группы').parent().find('.ff-trigger').click();
    cy.get('.ff-dropdown').contains('.ff-option', 'Каратэ').click();
    cy.get('.ff-dropdown').contains('.ff-option', 'Бокс').click();
    cy.get('body').click(10, 10);
    cy.contains('button', 'Сохранить').click();
    cy.contains('.record-card', '+77001112233', { timeout: 10000 }).should('be.visible')
      .and('contain.text', 'Каратэ').and('contain.text', 'Бокс');
    cy.screenshot('04-new-client-two-groups');
  });
});
